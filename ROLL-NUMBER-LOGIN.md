# Roll Number Login Feature

Students can now login using either their email address or roll number.

## How It Works

### Backend Changes

1. **Login Endpoint Updated** (`server/routes/auth.js`)
   - The login endpoint now accepts either email or roll number in the `email` field
   - First attempts to find user by email
   - If not found, searches by roll number
   - Returns appropriate error messages for invalid credentials

2. **User Model Enhanced** (`server/models/User.js`)
   - Added sparse unique index on `rollNumber` field
   - Allows multiple null values but enforces uniqueness for non-null roll numbers
   - Prevents duplicate roll numbers in the system

### Frontend Changes

1. **Login Page Updated** (`client/src/pages/Login.js`)
   - Input field label changed to "Email or Roll Number"
   - Input type changed from `email` to `text` to accept roll numbers
   - Placeholder updated to show both options

## Usage Examples

### For Students

**Login with Email:**
```
Email or Roll Number: student@example.com
Password: ********
```

**Login with Roll Number:**
```
Email or Roll Number: 21B01A0501
Password: ********
```

### For Administrators

When creating or uploading students in bulk:

1. **Single User Creation:**
   - Include `rollNumber` field when creating users via admin panel
   - Roll number must be unique across all users

2. **Bulk Upload (Excel/CSV):**
   - Column 1: Roll Number
   - Column 2: Name
   - Column 3: Email
   - Column 4: Password
   - Column 5: Branch
   - Column 6: Section
   - Column 7: Year
   - Column 8: Role

   If email is missing, system auto-generates: `{rollNumber}@svecw.edu.in`
   If password is missing, system uses roll number as default password

## Security Considerations

1. **Account Lockout:** Works the same for both email and roll number login
2. **Rate Limiting:** Applied equally to both login methods
3. **Audit Logging:** Logs login attempts with identifier (email or roll number)
4. **Case Sensitivity:** 
   - Email is case-insensitive (converted to lowercase)
   - Roll number is case-sensitive (trimmed but preserves case)

## Database Index

The system creates a sparse unique index on the `rollNumber` field:

```javascript
userSchema.index({ rollNumber: 1 }, { unique: true, sparse: true });
```

This ensures:
- No duplicate roll numbers
- Multiple users can have null/undefined roll numbers
- Fast lookup performance for roll number queries

## API Endpoint

**POST** `/api/auth/login`

**Request Body:**
```json
{
  "email": "student@example.com OR 21B01A0501",
  "password": "your_password"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "_id": "...",
    "name": "Student Name",
    "email": "student@example.com",
    "rollNumber": "21B01A0501",
    "role": "student",
    ...
  }
}
```

**Error Responses:**
- `401`: Invalid credentials (wrong email/roll number or password)
- `423`: Account locked due to multiple failed attempts
- `400`: Validation errors

## Testing

### Test Cases

1. **Login with valid email:**
   - Input: `student@example.com` + correct password
   - Expected: Successful login

2. **Login with valid roll number:**
   - Input: `21B01A0501` + correct password
   - Expected: Successful login

3. **Login with invalid credentials:**
   - Input: `nonexistent@example.com` + any password
   - Expected: 401 error

4. **Login with wrong password:**
   - Input: valid email/roll number + wrong password
   - Expected: 401 error, login attempts incremented

5. **Account lockout:**
   - Input: 5 consecutive failed login attempts
   - Expected: Account locked for 30 minutes

## Migration Notes

For existing systems:

1. **No data migration required** - Roll number field already exists in User model
2. **Existing users** can continue logging in with email
3. **New users** can be assigned roll numbers during creation
4. **Bulk upload** can populate roll numbers for existing users

## Future Enhancements

Potential improvements:

1. Add roll number validation patterns (e.g., format checking)
2. Support multiple roll number formats for different institutions
3. Add roll number to registration form
4. Allow users to update their roll number from profile page
5. Add roll number search in admin user management
