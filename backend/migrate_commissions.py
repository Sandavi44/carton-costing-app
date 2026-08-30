import sqlite3
import os

db_path = r"c:\Users\Sandavi\projects\costing application\backend\instance\carton_costing.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

columns_to_add = [
    ("has_inhouse_commission", "BOOLEAN DEFAULT 0"),
    ("has_third_party_commission", "BOOLEAN DEFAULT 0"),
    ("third_party_commission", "FLOAT DEFAULT 0.0"),
    ("has_transport", "BOOLEAN DEFAULT 0"),
    ("transport_cost", "FLOAT DEFAULT 0.0")
]

for col_name, col_type in columns_to_add:
    try:
        cursor.execute(f"ALTER TABLE quote ADD COLUMN {col_name} {col_type};")
        print(f"Added column {col_name}")
    except sqlite3.OperationalError as e:
        print(f"Column {col_name} might already exist: {e}")

conn.commit()
conn.close()
print("Migration completed!")
