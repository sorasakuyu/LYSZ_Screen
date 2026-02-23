import psycopg2

db = psycopg2.connect(
    host='localhost',
    user='postgres',
    password='EdbzFZGzs8ZDiMZ4',
    dbname='kaguya2',
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
            value TEXT NOT NULL,
            device TEXT NOT NULL DEFAULT ''
        );
        """
        alter_sql = """ALTER TABLE config ADD COLUMN IF NOT EXISTS device TEXT NOT NULL DEFAULT ''"""
        insert_default_sql = """
        INSERT INTO config (key, value, device)
        VALUES
            ('mode', 'default', 'default'),
            ('notice_mode', 'text', 'default')
        ON CONFLICT (key) DO NOTHING;
        """
        with self.conn.cursor() as cur:
            cur.execute(create_sql)
            cur.execute(alter_sql)
            cur.execute(insert_default_sql)
        self.conn.commit()

class Create_Video:
    def __init__(self, conn: psycopg2.extensions.connection) -> None:
        self.conn = conn

    def create_table(self) -> None:
        """创建表"""
        create_sql = """
        CREATE TABLE IF NOT EXISTS video (
            device TEXT NOT NULL,
            url TEXT PRIMARY KEY
        );
        """
        insert_default_sql = """
        INSERT INTO video (device, url)
        VALUES
            ('default', 'http://0.0.0.0/test/video.mp4')
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
            device TEXT NOT NULL DEFAULT 'default',
            title TEXT NOT NULL,
            context TEXT NOT NULL
        );
        """
        alter_device_sql = """
        ALTER TABLE notice_text
        ADD COLUMN IF NOT EXISTS device TEXT NOT NULL DEFAULT 'default'
        """
        drop_title_pk_sql = """
        ALTER TABLE notice_text
        DROP CONSTRAINT IF EXISTS notice_text_pkey
        """
        drop_title_unique_sql = """
        ALTER TABLE notice_text
        DROP CONSTRAINT IF EXISTS notice_text_title_key
        """
        add_unique_sql = """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'notice_text_device_title_key'
            ) THEN
                ALTER TABLE notice_text
                ADD CONSTRAINT notice_text_device_title_key UNIQUE (device, title);
            END IF;
        END $$;
        """
        insert_default_sql = """
        INSERT INTO notice_text (device, title, context)
        VALUES
            ('default', '通知', '这是一条测试通知。')
        ON CONFLICT (device, title) DO NOTHING;
        """
        with self.conn.cursor() as cur:
            cur.execute(create_sql)
            cur.execute(alter_device_sql)
            cur.execute(drop_title_pk_sql)
            cur.execute(drop_title_unique_sql)
            cur.execute(add_unique_sql)
            cur.execute(insert_default_sql)
        self.conn.commit()

class Create_Notice_Picture:
    def __init__(self, conn: psycopg2.extensions.connection) -> None:
        self.conn = conn

    def create_table(self) -> None:
        """创建表"""
        create_sql = """
        CREATE TABLE IF NOT EXISTS notice_picture (
            device TEXT NOT NULL,
            url TEXT PRIMARY KEY
        );
        """
        insert_default_sql = """
        INSERT INTO notice_picture (device, url)
        VALUES
            ('default', 'http://0.0.0.0/test/pic.jpg')
        ON CONFLICT (url) DO NOTHING;
        """
        with self.conn.cursor() as cur:
            cur.execute(create_sql)
            cur.execute(insert_default_sql)
        self.conn.commit()

class Create_Device_List:
    def __init__(self, conn: psycopg2.extensions.connection) -> None:
        self.conn = conn

    def create_table(self) -> None:
        """创建表"""
        create_sql = """
        CREATE TABLE IF NOT EXISTS device_list (
            device_id TEXT PRIMARY KEY,
            remark TEXT NOT NULL DEFAULT ''
        );
        """
        insert_default_sql = """
        INSERT INTO device_list (device_id, remark)
        VALUES
            ('default', '测试设备')
        ON CONFLICT (device_id) DO NOTHING;
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
    Create_Device_List(db).create_table()
    db.close()

