# AI BEHAVIORAL INSTRUCTIONS

1. STRICT DATABASE SCOPE:
   - You are ONLY allowed to operate on the STRICTLY STAGING database.
   - Staging Project ID: tnkwhxxxyixoohtmdinx
   - Production Project ID: pbmfjygapqgaiwyakwxv
   - NEVER execute SQL or migrations against Production unless explicitly overridden by the user.

2. CODE STABILITY:
   - Do not delete existing logic unless instructed.
   - Always check App.tsx state dependencies before extracting components.

3. TERMINAL COMMANDS:
   - The user is running natively. Use standard npm, npx, and git commands.