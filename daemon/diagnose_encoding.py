import psycopg2
import os

DB_CONFIG = {
    "host": os.getenv("PG_HOST", "localhost"),
    "user": os.getenv("PG_USER", "kaguya"),
    "password": os.getenv("PG_PASSWORD", "FX7R4Ap3imY7NNzy"),
    "dbname": os.getenv("PG_DATABASE", "kaguya"),
    "port": int(os.getenv("PG_PORT", "5432")),
}

print("=== 数据库编码诊断 ===\n")

try:
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    print("1. 数据库服务器编码:")
    cur.execute("SHOW SERVER_ENCODING")
    print(f"   SERVER_ENCODING: {cur.fetchone()[0]}")
    
    cur.execute("SHOW CLIENT_ENCODING")
    print(f"   CLIENT_ENCODING: {cur.fetchone()[0]}")
    
    print("\n2. 数据库编码:")
    cur.execute("SELECT datname, pg_encoding_to_char(encoding) FROM pg_database WHERE datname = current_database()")
    row = cur.fetchone()
    print(f"   数据库名: {row[0]}, 编码: {row[1]}")
    
    print("\n3. 尝试读取 renmindaily 表数据:")
    cur.execute("SELECT id, content, defination FROM renmindaily LIMIT 1")
    row = cur.fetchone()
    if row:
        print(f"   ID: {row[0]}")
        print(f"   content: {row[1][:50] if row[1] else 'None'}...")
        print(f"   defination: {row[2][:50] if row[2] else 'None'}...")
    else:
        print("   表为空")
    
    print("\n4. 尝试读取 config 表数据:")
    cur.execute("SELECT key, value FROM config LIMIT 3")
    rows = cur.fetchall()
    for row in rows:
        print(f"   {row[0]}: {row[1]}")
    
    print("\n=== 诊断完成 ===")
    
except Exception as e:
    print(f"错误: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
finally:
    try:
        conn.close()
    except:
        pass
