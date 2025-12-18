#!/usr/bin/env python3
"""Check marketplace database contents"""
import sqlite3

conn = sqlite3.connect('marketplace_test.db')
cursor = conn.cursor()

# Check products count
cursor.execute('SELECT COUNT(*) FROM marketplace_products')
count = cursor.fetchone()[0]
print(f'Total products: {count}')

# Check sample products
cursor.execute('SELECT id, name, slug, active, category FROM marketplace_products LIMIT 10')
print('\nSample products:')
for row in cursor.fetchall():
    print(f'  ID: {row[0]}, Name: {row[1]}, Slug: {row[2]}, Active: {row[3]}, Category: {row[4]}')

# Check categories
cursor.execute('SELECT COUNT(*) FROM marketplace_categories')
cat_count = cursor.fetchone()[0]
print(f'\nTotal categories: {cat_count}')

cursor.execute('SELECT id, name, slug FROM marketplace_categories')
print('Categories:')
for row in cursor.fetchall():
    print(f'  ID: {row[0]}, Name: {row[1]}, Slug: {row[2]}')

conn.close()
