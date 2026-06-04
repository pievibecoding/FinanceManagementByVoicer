-- SQL Cơ bản: Tổng hợp chi tiêu theo từng Danh mục
SELECT
    cd.category_name,
    SUM(tf.amount) AS total_amount
FROM Transaction_Fact tf
JOIN Category_Dim cd ON tf.category_id = cd.category_id
GROUP BY cd.category_name;

-- SQL Cơ bản: Tổng hợp chi tiêu theo tháng
SELECT
    strftime('%Y-%m', tf.date) AS month,
    SUM(tf.amount) AS total_amount
FROM Transaction_Fact tf
JOIN Category_Dim cd ON tf.category_id = cd.category_id
WHERE cd.category_type = 'Chi phí'
GROUP BY month;

-- SQL Trung cấp: Cảnh báo chi tiêu vượt ngưỡng (Cần thêm bảng Budget_Dim)
-- Ví dụ bảng Budget_Dim:
-- CREATE TABLE Budget_Dim (
--     budget_id TEXT PRIMARY KEY,
--     category_id TEXT NOT NULL,
--     monthly_budget INTEGER NOT NULL,
--     FOREIGN KEY (category_id) REFERENCES Category_Dim(category_id)
-- );

-- Truy vấn cảnh báo chi tiêu vượt ngưỡng
SELECT
    cd.category_name,
    SUM(tf.amount) AS total_spent,
    bd.monthly_budget AS budget_limit,
    CASE
        WHEN SUM(tf.amount) > bd.monthly_budget THEN 'Vượt hạn mức'
        ELSE 'Trong hạn mức'
    END AS status
FROM Transaction_Fact tf
JOIN Category_Dim cd ON tf.category_id = cd.category_id
JOIN Budget_Dim bd ON cd.category_id = bd.category_id
WHERE strftime('%Y-%m', tf.date) = strftime('%Y-%m', 'now') -- Cho tháng hiện tại
GROUP BY cd.category_name, bd.monthly_budget;

-- SQL Nâng cao: Số dư lũy kế (Running Total) theo thời gian thực
SELECT
    ad.account_name,
    tf.date,
    tf.amount,
    SUM(CASE WHEN cd.category_type = 'Thu nhập' THEN tf.amount ELSE -tf.amount END) OVER (
        PARTITION BY tf.account_id
        ORDER BY tf.date
    ) AS running_balance
FROM Transaction_Fact tf
JOIN Account_Dim ad ON tf.account_id = ad.account_id
JOIN Category_Dim cd ON tf.category_id = cd.category_id
ORDER BY ad.account_name, tf.date;
