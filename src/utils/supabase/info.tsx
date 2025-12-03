// Supabase configuration
// These values MUST be loaded from environment variables
// Set them in your .env file (see .env.example)

const projectIdEnv = import.meta.env.VITE_SUPABASE_PROJECT_ID
const publicAnonKeyEnv = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate that required environment variables are set
if (!projectIdEnv || !publicAnonKeyEnv) {
  throw new Error(
    '❌ Supabase environment variables are required!\n' +
    'Please create a .env file with:\n' +
    '  VITE_SUPABASE_PROJECT_ID=your-project-id\n' +
    '  VITE_SUPABASE_ANON_KEY=your-anon-key\n' +
    'See .env.example for reference.'
  )
}

export const projectId = projectIdEnv
export const publicAnonKey = publicAnonKeyEnv