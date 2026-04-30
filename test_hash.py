import bcrypt

hash_str = "$2b$12$YWG2z4XenEhsAPDwKKngVOjD0wMF6l7glxDP.vKJKecjSV9SVWp5K"
pw = "SecureGuard2026!"

print("Result:", bcrypt.checkpw(pw.encode('utf-8'), hash_str.encode('utf-8')))
