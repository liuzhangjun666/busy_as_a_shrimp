import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# 加载环境变量
load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"))

# 获取数据库连接 URL
# 从 .env 中读取，如果不存在则使用默认值
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # 兼容 Monorepo 环境下的变量映射
    mysql_host = os.getenv("MYSQL_HOST", "localhost")
    mysql_port = os.getenv("MYSQL_PORT", "3306")
    mysql_user = os.getenv("MYSQL_USER", "root")
    mysql_password = os.getenv("MYSQL_PASSWORD", "123456")
    mysql_db = os.getenv("MYSQL_DATABASE", "busy_as_a_shrimp")
    DATABASE_URL = f"mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_db}"
elif DATABASE_URL.startswith("mysql://"):
    # SQLAlchemy 要求使用 mysql+pymysql 协议
    DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://")

engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
