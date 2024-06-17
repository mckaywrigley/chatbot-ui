// import * as dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"
// import path from "path"

// dotenv.config({ path: path.resolve(__dirname, "../../.env.local") })

// Initialize the Supabase client with your Supabase URL and Anon Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl!, supabaseKey!)

async function updateDatabase() {
  console.log("Starting teardown")
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "test@learntime.ai", //d0e1c3fb-7a58-4419-ba16-31904034d36a
    password: "1qasw23ed"
  })

  if (error) {
    console.error("Authentication error:", error)
    return
  }

  const profileId = data.user.id

  // Perform the database update
  const { data: responseData, error: updateError } = await supabase
    .from("profiles")
    .update({
      has_onboarded: false
    })
    .eq("user_id", profileId)
    .single()

  if (updateError) {
    console.error("Update error:", updateError)
  } else {
    console.log("Row updated successfully:", responseData)
  }
}

export default updateDatabase
