USE shinde_mala_erp;

-- Assuming branch_id 1 is Shinde Mala and categories 1 to 12 exist from schema.sql
-- (1: Starters, 2: Soups, 3: Snacks, 4: Breads, 5: Rice & Biryani, 6: Main Course, 7: Beer, 8: Whisky, 9: Rum, 10: Cocktails, 11: Mocktails, 12: Desserts)

INSERT INTO menu_items (branch_id, category_id, name, description, price, cost_price, dietary_flag, cgst_rate, sgst_rate, vat_rate, preparation_time_minutes) VALUES
-- Starters
(1, 1, 'Kaju Masala Fry', 'Roasted cashews in spicy masala', 250.00, 100.00, 'veg', 2.50, 2.50, 0.00, 15),
(1, 1, 'Surmai Rawa Fry', 'Fresh kingfish coated in semolina and fried', 450.00, 200.00, 'non-veg', 2.50, 2.50, 0.00, 20),
(1, 1, 'Chicken Sukka', 'Traditional dry chicken preparation', 320.00, 150.00, 'non-veg', 2.50, 2.50, 0.00, 20),
(1, 1, 'Paneer Tikka', 'Tandoori marinated cottage cheese', 280.00, 120.00, 'veg', 2.50, 2.50, 0.00, 15),

-- Main Course
(1, 6, 'Mutton Malvani', 'Spicy Malvani style mutton curry', 550.00, 250.00, 'non-veg', 2.50, 2.50, 0.00, 25),
(1, 6, 'Veg Kolhapuri', 'Mixed vegetables in a fiery Kolhapuri gravy', 240.00, 90.00, 'veg', 2.50, 2.50, 0.00, 20),
(1, 6, 'Pomfret Curry', 'Pomfret fish cooked in coconut-based gravy', 600.00, 300.00, 'non-veg', 2.50, 2.50, 0.00, 25),

-- Rice & Biryani
(1, 5, 'Chicken Dum Biryani', 'Fragrant basmati rice cooked with chicken', 350.00, 150.00, 'non-veg', 2.50, 2.50, 0.00, 25),
(1, 5, 'Jeera Rice', 'Cumin tempered basmati rice', 120.00, 40.00, 'veg', 2.50, 2.50, 0.00, 10),

-- Whisky (VAT applies instead of GST)
(1, 8, 'Blenders Pride', 'Indian blended whisky (30ml)', 180.00, 60.00, 'veg', 0.00, 0.00, 10.00, 2),
(1, 8, 'Royal Stag', 'Indian whisky (30ml)', 140.00, 45.00, 'veg', 0.00, 0.00, 10.00, 2),
(1, 8, 'Antiquity Blue', 'Premium Indian whisky (30ml)', 220.00, 80.00, 'veg', 0.00, 0.00, 10.00, 2),
(1, 8, 'Amrut Single Malt', 'Indian single malt whisky (30ml)', 450.00, 200.00, 'veg', 0.00, 0.00, 10.00, 2),
(1, 8, 'Officer''s Choice', 'Popular Indian whisky (30ml)', 120.00, 35.00, 'veg', 0.00, 0.00, 10.00, 2),

-- Beer (VAT applies instead of GST)
(1, 7, 'Kingfisher Premium', 'Mild Indian beer (650ml)', 220.00, 90.00, 'veg', 0.00, 0.00, 10.00, 2),
(1, 7, 'Bira 91 Blonde', 'Indian craft beer (330ml)', 180.00, 75.00, 'veg', 0.00, 0.00, 10.00, 2),

-- Rum (VAT applies instead of GST)
(1, 9, 'Old Monk', 'Classic Indian dark rum (30ml)', 90.00, 25.00, 'veg', 0.00, 0.00, 10.00, 2),

-- Mocktails / Beverages
(1, 11, 'Sol Kadhi', 'Traditional Konkani digestive drink', 80.00, 20.00, 'veg', 2.50, 2.50, 0.00, 5),
(1, 11, 'Fresh Lime Soda', 'Refreshing lime drink', 60.00, 15.00, 'veg', 2.50, 2.50, 0.00, 5);
