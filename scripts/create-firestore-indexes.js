// This script helps you create the required Firestore indexes
// Run this after updating your security rules

const indexUrls = [
    // Messages collection composite index
    "https://console.firebase.google.com/v1/r/project/aichatbot-758ba/firestore/indexes?create_composite=ClBwcm9qZWN0cy9haWNoYXRib3QtNzU4YmEvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL21lc3NhZ2VzL2luZGV4ZXMvXxABGg0KCXNlc3Npb25JZBABGgoKBnVzZXJJZBABGg0KCXRpbWVzdGFtcBABGgwKCF9fbmFtZV9fEAE",

    // ChatSessions collection composite index
    "https://console.firebase.google.com/v1/r/project/aichatbot-758ba/firestore/indexes?create_composite=ClRwcm9qZWN0cy9haWNoYXRib3QtNzU4YmEvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2NoYXRTZXNzaW9ucy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoNCgl0aW1lc3RhbXAQAhoMCghfX25hbWVfXxAC",
]

console.log("🔥 Firestore Index Creation Guide")
console.log("==================================")
console.log("")
console.log("Please click on these URLs to create the required indexes:")
console.log("")

indexUrls.forEach((url, index) => {
    console.log(`${index + 1}. ${url}`)
    console.log("")
})

console.log("After clicking each URL:")
console.log("1. Click 'Create Index' button")
console.log("2. Wait for the index to build (may take a few minutes)")
console.log("3. Repeat for all URLs above")
console.log("")
console.log("Once all indexes are created, your app will work properly!")
console.log("Thank you for using this script! 🚀")