// Import the functions you need from the SDKs you need
const { initializeApp } = require ("firebase/app");

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCossUh6Bg87ACjz83H3rYM8n-8l9lg9pM",
  authDomain: "pncode-app.firebaseapp.com",
  projectId: "pncode-app",
  storageBucket: "pncode-app.appspot.com",
  messagingSenderId: "93971197778",
  appId: "1:93971197778:web:bae9b007b5c45f00b6548b",
  measurementId: "G-3NLLF8LB5M"
};

// const firebaseConfig = {
//   apiKey: process.env.FIREBASE_KEY,
//   authDomain: process.env.FIREBASE_DOMAIN,
//   projectId: process.env.FIREBASE_PROJID,
//   storageBucket: process.env.FIREBASE_BUCKET,
//   messagingSenderId: process.env.FIREBASE_SENDER,
//   appId: process.env.FIREBASE_APPID,
//   measurementId: process.env.FIREBASE_MEASURE
// };


// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

module.exports = firebaseApp

// {"_id":{"$oid":"66af4fb5eee07440df89dc4a"},
//   "email": "lleguejohnromar02@gmail.com",
//   "first_name": "John Romar",
//   "last_name": "Llegue",
//   "password": "adminadmin",
//   "position": "Student",
//   "section": "4IT-B",
//   "teams": [
//     "8de05ac7-2f68-4eb0-96dc-e9208bb77c61"
//   ],
//   "enrolled_courses": [
//     {
//       "course_code": "ITEW5",
//       "section": "4IT-B"
//     },
//     {
//       "course_code": "ITP110",
//       "section": "4IT-B"
//     }
//   ],
//   "solo_rooms": [
//     "f9aaa265-7fcd-42cc-8dd5-ea901d8a1956",
//     "9e62b7de-3c07-4884-beaf-a18735864046",
//     "43d5f7e7-023d-447f-aa32-bb248b3cc51c",
//     "9226ab45-f908-4c49-af05-cf4c8eb8b9d0"
//   ],
//   "assigned_rooms": [],
//   "preferences": {},
//   "createdAt": {
//     "$date": "2024-07-12T09:29:31.731Z"
//   },
//   "updatedAt": {
//     "$date": "2024-07-30T12:51:48.610Z"
//   },
//   "__v": 0

// }