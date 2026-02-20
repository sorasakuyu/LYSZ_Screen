import psycopg2

db = psycopg2.connect(
    host='localhost',
    user='kaguya',
    password='Mb7cp5MLTPKNWy4y',
    dbname='kaguya',
    port=5432,
)
db.autocommit = True

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

class Create_Config:
    def __init__(self, conn: psycopg2.extensions.connection) -> None:
        self.conn = conn

    def create_table(self) -> None:
        """创建表"""
        create_sql = """
        CREATE TABLE IF NOT EXISTS config (
            key TEXT NOT NULL UNIQUE,
            value TEXT NOT NULL
        );
        """
        insert_default_sql = """
        INSERT INTO config (key, value)
        VALUES
            ('mode', 'default'),
            ('notice_mode', 'text')
        ON CONFLICT (key) DO NOTHING;
        """
        with self.conn.cursor() as cur:
            cur.execute(create_sql)
            cur.execute(insert_default_sql)
        self.conn.commit()

class Create_Video:
    def __init__(self, conn: psycopg2.extensions.connection) -> None:
        self.conn = conn

    def create_table(self) -> None:
        """创建表"""
        create_sql = """
        CREATE TABLE IF NOT EXISTS video (
            url TEXT PRIMARY KEY
        );
        """
        insert_default_sql = """
        INSERT INTO video (url)
        VALUES
            ('http://0.0.0.0/test/video.mp4')
        ON CONFLICT (url) DO NOTHING;
        """
        with self.conn.cursor() as cur:
            cur.execute(create_sql)
            cur.execute(insert_default_sql)
        self.conn.commit()

class Create_Notice_Text:
    def __init__(self, conn: psycopg2.extensions.connection) -> None:
        self.conn = conn

    def create_table(self) -> None:
        """创建表"""
        create_sql = """
        CREATE TABLE IF NOT EXISTS notice_text (
            title TEXT PRIMARY KEY,
            context TEXT NOT NULL
        );
        """
        insert_default_sql = """
        INSERT INTO notice_text (title, context)
        VALUES
            ('通知', '这是一条测试通知。')
        ON CONFLICT (title) DO NOTHING;
        """
        with self.conn.cursor() as cur:
            cur.execute(create_sql)
            cur.execute(insert_default_sql)
        self.conn.commit()

class Create_Notice_Picture:
    def __init__(self, conn: psycopg2.extensions.connection) -> None:
        self.conn = conn

    def create_table(self) -> None:
        """创建表"""
        create_sql = """
        CREATE TABLE IF NOT EXISTS notice_picture (
            url TEXT PRIMARY KEY
        );
        """
        insert_default_sql = """
        INSERT INTO notice_picture (url)
        VALUES
            ('http://0.0.0.0/test/pic.jpg')
        ON CONFLICT (url) DO NOTHING;
        """
        with self.conn.cursor() as cur:
            cur.execute(create_sql)
            cur.execute(insert_default_sql)
        self.conn.commit()

if __name__ == "__main__":
    Create_Renmindaily(db).create_table()
    Create_Daysmaster(db).create_table()
    Create_Config(db).create_table()
    Create_Video(db).create_table()
    Create_Notice_Text(db).create_table()
    Create_Notice_Picture(db).create_table()
    db.close()

