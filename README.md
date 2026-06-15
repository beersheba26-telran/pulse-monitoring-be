# Authorization on Backend
## JWT example Structure (only required fields)
{
    "username": "doc_01",
    "cognito:groups":["DOCTOR"]
}
## user_context midddleware function 
### Creating user context based on JWT from header Authorization "Bearer < JWT token >"
- using NPM package "jwt-decode"
- if JWT is missing  additional fileds of req should be set in null
- if JWT exists after its parsing with no any verification the middleware should add field user_id with user ID from JWT "username"  and role (either DOCTOR or PATIENT) from JWT "cognito:groups" ( see the JWT structure fro the above example)
## auth function (its call should be passed to endpoint requiring authentication)
### input parameter
- takes role either "DOCTOR" or "PATIENT" or ""
### output 
#### returns middleware function performing following
- if  field req.user_id is null throws 401 exception
- if input parameter "DOCTOR" the req.role should be DOCTOR and path variable should be equaled req.user-id otherwise throws 403 exception
- if input parameter "PATIENT" the req.role should be PATIENT and path variable should be equaled req.user-id otherwise throws 403 exception
- if input parameter "" the req.role value isn't considered
## updating app.ts
- add app.use for user_context middlware
## updating routes
- add appropriate auth function call inside appropriate endpoints
## Test
### Generating two JWT using https://www.jwt.io/?utm_source=chatgpt.com and the mentioned example of JWT payload structure
- for Doctor (for example doc_01) 
- for Patient (for example pat_001)
- performing tests using Postman
