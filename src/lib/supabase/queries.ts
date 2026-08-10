import 'server-only'
import { createClient } from './server'

export async function getUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return profile
}

export async function getActiveResume() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: resume, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', user.id) // Assuming user_id exists
    // .eq('is_active', true) // Add when schema is clear
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching active resume:', error)
  }

  return resume || null
}
