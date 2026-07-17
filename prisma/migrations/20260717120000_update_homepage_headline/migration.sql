-- Keep existing default homepage content aligned with the current storefront headline.
UPDATE "HomepageContent"
SET "headline" = 'Reliable, Safe and Efficient'
WHERE "headline" = 'Everyday clean, elevated'
   OR lower(regexp_replace(trim("headline"), '[^a-z0-9]+', ' ', 'g')) = 'reliable safe and efficient';
