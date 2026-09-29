# TIME IS RESPECT — Online / Shared Database

เวอร์ชันนี้ต่างจาก ZIP แรกตรงที่ข้อมูลของทุกคนจะถูกส่งเข้า Supabase Database เดียวกัน

โครงสร้าง:
GitHub Pages → เว็บไซต์ → Supabase → Dashboard รวมข้อมูล A/B/C/D

## ทำตามนี้ทีละขั้น

### 1) สร้าง Supabase
เข้า Supabase แล้วสร้าง Project ใหม่แบบ Free

### 2) สร้าง Database
ใน Supabase เปิด:

SQL Editor → New query

เปิดไฟล์ `supabase.sql` ที่อยู่ในโฟลเดอร์นี้
คัดลอกทั้งหมด → วางใน SQL Editor → กด Run

SQL จะสร้าง:
- sessions table
- สิทธิ์ให้ผู้เข้าชมส่งข้อมูล
- สิทธิ์ให้ Dashboard อ่านข้อมูลรวม
- function สำหรับคำนวณสถิติ
- Realtime สำหรับอัปเดต Dashboard

### 3) เอา Key มาใส่เว็บไซต์
ใน Supabase ไปที่:

Project Settings → API

เอา:
- Project URL
- Publishable key (หรือ legacy anon key)

ไปใส่ในไฟล์:

`supabase-config.js`

ตัวอย่าง:

window.SUPABASE_CONFIG = {
  url: "https://xxxxxxxx.supabase.co",
  anonKey: "xxxxxxxx"
};

สำคัญมาก:
ห้ามใส่ `service_role` หรือ Secret key ในเว็บไซต์

Publishable/anon key ออกแบบมาให้ใช้กับ frontend ได้ แต่ต้องควบคุมสิทธิ์ด้วย RLS ซึ่ง SQL ในไฟล์นี้ตั้งไว้แล้ว

### 4) อัปโหลดขึ้น GitHub
อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ไปยัง repository:

- index.html
- styles.css
- app.js
- supabase-config.js
- supabase.sql
- README.md

### 5) เปิด GitHub Pages
Repository → Settings → Pages

เลือก:
Deploy from a branch
Branch: main
Folder: / (root)

Save

รอ GitHub สร้างเว็บไซต์

## วิธีทดสอบว่า A/B/C/D รวมข้อมูลจริง

เปิดเว็บไซต์ด้วยมือถือ/คอมเครื่องที่ 1
→ เลือกเหตุผล
→ ใส่เวลาที่คิด
→ START
→ I'M HERE

จากนั้นเปิดเว็บไซต์เครื่องที่ 2
→ ดู LIVE DASHBOARD

จำนวนผู้เข้าร่วมควรเพิ่มขึ้น

ลองส่งจากเครื่อง 3 และ 4 ได้เช่นกัน
ทุกเครื่องจะใช้ Database เดียวกัน

## Realtime

Dashboard จะพยายามรับ event จาก Supabase Realtime และมี polling สำรองทุก 15 วินาที

ดังนั้นถ้า A ส่งข้อมูล:
B/C/D จะเห็นยอดเปลี่ยนโดยไม่ต้องอัปโหลดเว็บใหม่

## ข้อมูลที่เก็บ

เก็บเฉพาะ:
- เหตุผลที่เลือก
- เวลาที่คาดว่าจะใช้
- เวลาจริง
- วัน/เวลาที่ส่งข้อมูล

ไม่มี:
- ชื่อ
- อีเมล
- เบอร์โทร
- GPS
- บัญชีผู้ใช้

## ถ้าเปิดเว็บแล้วขึ้น DEMO MODE

แปลว่า `supabase-config.js` ยังไม่ได้ใส่ Project URL / Publishable key หรือใส่ผิดรูปแบบ

หลังแก้ไฟล์แล้วต้อง push ขึ้น GitHub ใหม่

## หมายเหตุเรื่องการใช้งานจริง

เวอร์ชันนี้เหมาะสำหรับ MVP / โปรเจกต์แคมเปญที่ต้องการเก็บข้อมูลแบบไม่ระบุตัวตน

ถ้าจะเปิดให้คนจำนวนมากมาก ๆ ในอนาคต ควรเพิ่มระบบป้องกัน spam เช่น rate limit / CAPTCHA / Edge Function
