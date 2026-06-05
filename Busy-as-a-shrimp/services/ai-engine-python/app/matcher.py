from sqlalchemy.orm import Session
from .models import Resource, Match, MatchStatus
from decimal import Decimal
import json

def calculate_jaccard_similarity(set1: set, set2: set) -> float:
    """
    计算 Jaccard 相似度：交集大小 / 并集大小
    """
    if not set1 or not set2:
        return 0.0
    
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    
    return intersection / union if union > 0 else 0.0

def run_ai_matching(db: Session):
    """
    核心 AI 匹配任务：
    1. 查找所有 match_score 为 0 且状态为 'pushed' 的匹配记录。
    2. 根据 Resource 的标签和关联属性重新计算分值。
    3. 更新数据库评分。
    """
    # 获取待处理的匹配记录
    pending_matches = db.query(Match).filter(
        Match.match_score == 0,
        Match.status == "pushed"
    ).all()

    if not pending_matches:
        print("[AI-ENGINE] No pending matches found with zero score.")
        return

    print(f"[AI-ENGINE] Processing {len(pending_matches)} matches...")

    # 获取所有相关的资源
    resource_ids = {m.resource_id for m in pending_matches}
    resources_map = {r.resource_id: r for r in db.query(Resource).filter(
        Resource.resource_id.in_(resource_ids)
    ).all()}

    updated_count = 0
    for match in pending_matches:
        resource = resources_map.get(match.resource_id)
        if not resource:
            continue
            
        # 1. 解析标签
        # 这里的 tags 可能是 JSON 字符串或列表，SQLAlchemy 自动处理 JSON 字段时通常返回 Python 对象
        r_tags_raw = resource.tags if isinstance(resource.tags, list) else []
        if isinstance(resource.tags, str):
            try:
                r_tags_raw = json.loads(resource.tags)
            except:
                r_tags_raw = []
        
        # 2. 假设 need 的标签也存储在某处，或者从 match.need_id 映射回来
        # 在 MVP 阶段，我们先通过 Mock 逻辑增强算法的真实度：
        # 对于 need_id，我们使用一个确定的伪随机属性池模拟真实需求
        mock_need_tags = set([
            "short-video", "live-stream", "shanghai", "beijing", 
            "weekday-day", "editing"
        ]) if match.need_id % 2 == 0 else set([
            "private-domain", "script-writing", "guangzhou", "long-term"
        ])
        
        # 3. 计算相似度
        r_tags_set = set([str(t).lower() for t in r_tags_raw])
        score = calculate_jaccard_similarity(mock_need_tags, r_tags_set)
        
        # 4. 复合评分 (0-1 缩放到 0-100)
        # 基础分 40 + 相似度分 60
        final_score = Decimal(str(round(40 + (score * 60), 2)))
        
        # 5. 更新分值
        match.match_score = final_score
        updated_count += 1

    db.commit()
    print(f"[AI-ENGINE] Successfully updated {updated_count} match scores.")
