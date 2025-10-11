# YouTube Backend Clone

A backend implementation of core YouTube functionalities built with Node.js and Express.  
This project focuses on building scalable REST APIs for video sharing, user authentication, and content management.

---

## Features
- User authentication with JWT  
- Video upload and management  
- Like, dislike, and comment functionalities  
- Playlist creation and management  
- Channel subscription system  
- Secure routes using middleware  
- MongoDB integration with Mongoose  

---

## Tech Stack
- **Backend:** Node.js, Express.js  
- **Database:** MongoDB, Mongoose  
- **Authentication:** JWT, bcrypt  
- **Cloud Storage:** Cloudinary  

---

## Installation

### Prerequisites
Ensure you have the following installed:
- Node.js (v16 or higher)  
- MongoDB (local or cloud instance)  
- npm or yarn  

### Setup Steps
```bash
# Clone the repository
git clone https://github.com/Luciferalpha1/youtube-backend-clone.git

# Navigate to project directory
cd youtube-backend-clone

# Install dependencies
npm install

# Add environment variables
# Create a .env file in the root directory and include:
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Start the development server
npm start
```
---

## Future Improvements
- Implement video recommendations

- Add analytics for creators

- Integrate comment threading

- Add notification system

---

---

The project structure and approach were inspired by [Chai aur Code](https://www.youtube.com/@chaiaurcode).
<br>The primary goal, however, was to learn production grade backend development in depth by understanding each concept and making meaningful modifications throughout the project.
<br>Thank you.

---
