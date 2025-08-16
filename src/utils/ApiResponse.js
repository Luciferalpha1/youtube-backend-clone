class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode; // HTTP status code
    this.data = data; // actual response data (mostly json)
    this.message = message; // human-readable message
    this.success = statusCode < 400; // statuscodes < 400 are usually success based.
  }
}

export { ApiResponse };
