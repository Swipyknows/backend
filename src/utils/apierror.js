class ApiError extends Error{
    constructor(statusCodeOrOptions, message="Something went wrong!!", errors=[], stack=""){
        let statusCode;
        if (typeof statusCodeOrOptions === "object" && statusCodeOrOptions !== null) {
            ({ statusCode = 500, message = "Something went wrong!!", errors = [], stack = "" } = statusCodeOrOptions)
        } else {
            statusCode = statusCodeOrOptions
        }
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors
        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}
export {ApiError};