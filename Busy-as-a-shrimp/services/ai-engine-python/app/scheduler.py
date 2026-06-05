from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from .database import SessionLocal
from .matcher import run_ai_matching

scheduler = BackgroundScheduler()

def heartbeat() -> None:
    print(f"[AI-ENGINE] heartbeat at {datetime.now().isoformat()}")

def collect_demands() -> None:
    print(f"[AI-ENGINE] collect demands at {datetime.now().isoformat()}")

def run_matching() -> None:
    """
    触发 AI 算法执行。
    """
    print(f"[AI-ENGINE] run matching start at {datetime.now().isoformat()}...")
    db = SessionLocal()
    try:
        run_ai_matching(db)
    except Exception as e:
        print(f"[AI-ENGINE] run matching error: {e}")
    finally:
        db.close()

def setup_jobs() -> None:
    # 增加任务注册
    scheduler.add_job(heartbeat, "interval", minutes=5, id="heartbeat")
    scheduler.add_job(collect_demands, "interval", hours=6, id="collect-demands")
    # 增加每 5 分钟执行一次匹配检查，用于近实时回填
    scheduler.add_job(run_matching, "interval", minutes=5, id="minutely-matching")
    scheduler.start()

