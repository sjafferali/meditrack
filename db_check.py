import psycopg2

# Connect to the database
conn = psycopg2.connect('postgresql://meditrackgigi:11AsRHXHYB0f@db.local.samir.systems:5432/meditrackgigi')
cur = conn.cursor()

# Check persons table
print("=== PERSONS TABLE ===")
cur.execute('SELECT * FROM persons')
rows = cur.fetchall()

# Get column names
cur.execute('SELECT column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = \'persons\' ORDER BY ordinal_position')
cols = [col[0] for col in cur.fetchall()]
print(f"Columns: {cols}")

print("Data:")
for row in rows:
    print(row)

# Close the connection
conn.close()