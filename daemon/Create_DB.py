import psycopg2

db = psycopg2.connect(
    host='localhost',
    user='kaguya',
    password='Mb7cp5MLTPKNWy4y',
    dbname='kaguya',
    port=5432,
)

class Create_Renmindaily:
    def __init__(self, conn: psycopg2.extensions.connection) -> None:
        self.conn = conn

    def create_table(self) -> None:
        """创建表"""
        create_sql = """
        CREATE TABLE IF NOT EXISTS renmindaily (
            id SERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            defination TEXT NOT NULL
        );
        """
        alter_sql = """ALTER TABLE renmindaily ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT ''"""
        with self.conn.cursor() as cur:
            cur.execute(create_sql)
            cur.execute(alter_sql)
        self.conn.commit()

class Create_Daysmaster:
    def __init__(self, conn: psycopg2.extensions.connection) -> None:
        self.conn = conn

    def create_table(self) -> None:
        """创建表"""
        create_sql = """
        CREATE TABLE IF NOT EXISTS days_master (
            id BIGSERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            time TIMESTAMPTZ NOT NULL
        );
        """
        with self.conn.cursor() as cur:
            cur.execute(create_sql)
        self.conn.commit()

if __name__ == "__main__":
    Create_Renmindaily(db).create_table()
    Create_Daysmaster(db).create_table()
    db.close()

