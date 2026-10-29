const { z } = require('zod');

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required').trim(),
  password: z.string().min(1, 'Password is required')
});

module.exports = {
  loginSchema
};
