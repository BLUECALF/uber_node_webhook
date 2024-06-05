// src/server.js
const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const config = require('./config');
const multer = require('multer'); // Added multer
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();

// Configure multer (adjust storage based on your needs)
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/:id', async (req, res) => {
  const { id } = req.params; // Access the ID from the URL parameter
  try {
    const url = `${config.VERIFY_DRIVER_ENDPOINT}?id=${id}`; // Construct URL with ID as query parameter
    const response = await axios.get(url); // Send GET request with ID in query string

    const realData = response.data;

    res.render('result', { success: true, data: realData.data, error: null });
  } catch (error) {
    // Handle different error types
    if (axios.isAxiosError(error) && !error.response) {
      // Handle no internet errors (e.g., timeout)
      console.error('Error fetching data (likely no internet):', error);
      res.render('result', { success: false, data: null, error: 'We couldn\'t connect to the server. Please check your internet connection and try again later.' });
    } else if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 400:
          console.error('Error fetching data (400 Bad Request):', error);
          res.render('result', { success: false, data: null, error: 'Invalid driver details. Please check your input and try again.' });
          break;
        case 401:
          console.error('Error fetching data (401 Unauthorized):', error);
          res.render('result', { success: false, data: null, error: 'You are not authorized to access this data. Please check your credentials and try again.' });
          break;
        case 500:
          console.error('Error fetching data (500 Internal Server Error):', error);
          res.render('result', { success: false, data: null, error: 'An error occurred on the server. Please try again later.' });
          break;
        default:
          // Handle other server errors
          console.error('Error fetching data:', error);
          res.render('result', { success: false, data: null, error: 'An unexpected error occurred. Please try again later.' });
      }
    } else {
      // Handle other errors (e.g., parsing error)
      console.error('Error fetching data:', error);
      res.render('result', { success: false, data: null, error: 'An error occurred. Please try again later.' });
    }
  }
});
app.post('/webhook', async (req, res) => {
  try {
    let jsonData;
    if (req.is('json')) {
      // Parse JSON data
      jsonData = req.body;
    } else if (req.is('urlencoded')) {
      // Parse form-data
      jsonData = req.body;
    }     
    else {
      throw new Error('Unsupported content type');
    }

    // Log the received data
    console.log('Data received:', jsonData);

    // if we have no hidden form details we return 200 for purpose if initiating webhook.
    if(typeof jsonData.forminator_multifile_hidden === 'undefined')
        {
            res.status(200).json({ success: true, response: {} });
        } 

    let formData = await convertJsonToFormData(jsonData);

    console.log('FORM   DATA ##');
      console.log(formData);
    const response = await axios.post(config.EXTERNAL_ENDPOINT, formData, {
        headers: formData.getHeaders()
      });

      console.log("After posting we got ${response.data}");
      console.log(response.data);
      console.log('Data sent is');
      console.log(formData);

    /// post formdata to endpoint 

    res.status(200).json({ success: true, response: {} });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = config.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

const convertJsonToFormData = async (jsonData) => {
    const formData = new FormData();
  
    // Mapping for reasonable static keys
    const keyMap = {
      radio_1: 'idType',  
      name_1_first_name: 'firstName',
      name_1_middle_name: 'middleName',
      name_1_last_name: 'lastName',
      phone_1: 'phoneNumber',
      email_1: 'email',
      text_4: 'idNumber',
      //text_5: 'passportNumber',
      text_3: 'goodConductNumber',
      text_2: 'drivingLicenceNumber',
      text_1: 'psvLicenceNumber'
    };
  
    // Mapping for keys with uploads
    const uploadsKeyList = {
      upload_1: 'idFrontDocument',
      //upload_6: 'passportDocument',
      upload_3: 'goodConductDocument',
      upload_2: 'drivingLicenceDocument',
      upload_4: 'psvLicenceDocument',
      upload_5: 'profilePictureDocument',
      upload_7: 'idBackDocument',
    };
  
    // Iterate through the JSON object
    for (const key in jsonData) {
      if (key === 'consent_1' || key === 'entry_time') {
        // Neglect these keys
        continue;
      }
  
      let value = jsonData[key];
  
      if (key === 'radio_1') {
        // Adjust value for ID type
        value = (value === 'one') ? 'NATIONAL_ID' : 'PASSPORT';
      }
  
      if (uploadsKeyList[key] && (jsonData.forminator_multifile_hidden) && jsonData.forminator_multifile_hidden[key]) {
        // Handle file uploads
        const uploadKey = uploadsKeyList[key];
        const fileObject = jsonData.forminator_multifile_hidden[key][0]; // Get the file object
        if (fileObject) {
            // Determine the type and filename from the file path
            const { fileName, fileType } = parseFilePath(value);
            // Download the file from the URL
            const fileData = await downloadFile(value);
            // Add the file to FormData
            formData.append(uploadKey, fileData, {
                filename: fileName,
                contentType: fileType
            });
        }
    }else {
        if(keyMap[key])
            {
                let staticKey = keyMap[key];
                formData.append(staticKey, value);
            }
      }
    }

  // add national_id as idType
   formData.append('idType', 'NATIONAL_ID');
    return formData;
  };
  
  const downloadFile = (url) => {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (res) => {
            let data = Buffer.alloc(0);
            res.on('data', (chunk) => {
                data = Buffer.concat([data, chunk]);
            });
            res.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
};

// Function to determine the type and filename from the file path
const parseFilePath = (filePath) => {
    const fileName = path.basename(filePath);
    const fileType = path.extname(filePath).slice(1); // Remove the dot from the extension
    return { fileName, fileType };
};