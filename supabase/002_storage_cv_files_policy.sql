-- ============================================================================
-- SQL Setup: นโยบายความปลอดภัย (RLS Policies) สำหรับ Supabase Storage Bucket: cv_files
-- ============================================================================
-- รันโค้ดชุดนี้ใน Supabase Dashboard -> SQL Editor
-- เพื่อแก้ปัญหา Error: "new row violates row-level security policy"
-- ============================================================================

-- 1. ลบ Policy เดิมของ cv_files หากเคยมีอยู่แล้ว เพื่อป้องกันการซ้ำซ้อน
DROP POLICY IF EXISTS "Allow public upload to cv_files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public select from cv_files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update cv_files" ON storage.objects;

-- 2. อนุญาตให้ทุกคน/Backend สามารถอัปโหลดไฟล์ลงใน bucket 'cv_files' ได้ (INSERT)
CREATE POLICY "Allow public upload to cv_files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'cv_files');

-- 3. อนุญาตให้เปิดอ่าน/ดาวน์โหลดไฟล์จาก bucket 'cv_files' ได้ (SELECT)
CREATE POLICY "Allow public select from cv_files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'cv_files');

-- 4. อนุญาตให้อัปเดตไฟล์เดิมได้ในกรณีเขียนทับ (UPDATE / upsert)
CREATE POLICY "Allow public update cv_files"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'cv_files')
WITH CHECK (bucket_id = 'cv_files');
