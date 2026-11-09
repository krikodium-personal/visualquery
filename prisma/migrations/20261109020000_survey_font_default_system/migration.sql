-- New surveys default to system UI font; existing rows keep their stored value.
ALTER TABLE "Survey" ALTER COLUMN "fontFamily" SET DEFAULT 'system';
