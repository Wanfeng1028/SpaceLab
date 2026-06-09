package middleware

// Note: CSRF middleware is implemented but not used in this SPA + JWT API architecture.
// For SPA applications that only use Bearer Token authentication, CSRF protection is not required.
// If Cookie-based authentication is added in the future, register the CSRF() middleware on appropriate routes.
