"""
心率图片上传 API
"""
import os
import uuid
from typing import Optional
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from sqlalchemy import select

from ...db.database import get_sync_db
from ...db.models import HeartRateImage
from ...models.schemas import (
    HeartRateImageItem,
    HeartRateImageUploadData,
    HeartRateImageUploadResponse,
    HeartRateImageListData,
    HeartRateImageListResponse,
    HeartRateImageDeleteResponse,
)


router = APIRouter(prefix="/upload", tags=["upload"])

# 配置
UPLOAD_BASE_DIR = Path(__file__).parent.parent.parent.parent / "data" / "uploads" / "heart_rate"
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def validate_file(file: UploadFile) -> tuple[bool, str]:
    """
    验证上传文件
    
    Returns:
        (is_valid, error_message)
    """
    # 检查文件名
    if not file.filename:
        return False, "文件名为空"
    
    # 检查扩展名
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"不支持的文件格式: {ext}，仅支持 PNG, JPG, JPEG"
    
    return True, ""


def save_file(file: UploadFile, report_id: str) -> tuple[str, str]:
    """
    保存文件到本地
    
    Args:
        file: 上传的文件
        report_id: 报告ID
        
    Returns:
        (saved_path, original_filename)
    """
    # 创建目录
    report_dir = UPLOAD_BASE_DIR / report_id
    report_dir.mkdir(parents=True, exist_ok=True)
    
    # 生成唯一文件名
    ext = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = report_dir / unique_filename
    
    # 保存文件
    content = file.file.read()
    
    # 检查文件大小
    if len(content) > MAX_FILE_SIZE:
        raise ValueError(f"文件大小超过限制: {len(content) / 1024 / 1024:.1f}MB > 10MB")
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    return str(file_path), file.filename


def model_to_item(image: HeartRateImage) -> HeartRateImageItem:
    """将数据库模型转换为响应模型"""
    import json
    extracted = None
    if image.extracted_data:
        try:
            extracted = json.loads(image.extracted_data)
        except:
            pass
    
    return HeartRateImageItem(
        id=image.id,
        report_id=image.report_id,
        user_id=image.user_id,
        image_path=image.image_path,
        original_filename=image.original_filename,
        extracted_data=extracted,
        extraction_status=image.extraction_status,
        created_at=image.created_at.isoformat() if image.created_at else None,
    )


@router.post(
    "/heart-rate",
    response_model=HeartRateImageUploadResponse,
    summary="上传心率图片",
    description="上传心率截图，支持多文件上传。支持 PNG, JPG, JPEG 格式，单文件最大 10MB。"
)
async def upload_heart_rate_images(
    report_id: str = Form(..., description="关联的报告ID"),
    user_id: Optional[int] = Form(None, description="用户ID（可选）"),
    files: list[UploadFile] = File(..., description="图片文件列表"),
) -> HeartRateImageUploadResponse:
    """
    上传心率图片
    
    - **report_id**: 关联的报告ID（必填）
    - **user_id**: 用户ID（可选）
    - **files**: 支持多个图片文件同时上传
    
    图片会存储在 backend/data/uploads/heart_rate/{report_id}/ 目录下
    """
    uploaded = []
    failed = []
    
    with get_sync_db() as db:
        for file in files:
            try:
                # 验证文件
                is_valid, error_msg = validate_file(file)
                if not is_valid:
                    failed.append(f"{file.filename}: {error_msg}")
                    continue
                
                # 保存文件
                saved_path, original_filename = save_file(file, report_id)
                
                # 创建数据库记录
                image = HeartRateImage(
                    report_id=report_id,
                    user_id=user_id,
                    image_path=saved_path,
                    original_filename=original_filename,
                    extraction_status="pending",
                )
                db.add(image)
                db.commit()
                db.refresh(image)
                
                uploaded.append(model_to_item(image))
                
            except ValueError as e:
                failed.append(f"{file.filename}: {str(e)}")
            except Exception as e:
                failed.append(f"{file.filename}: 保存失败 - {str(e)}")
    
    return HeartRateImageUploadResponse(
        code=0,
        message=f"上传完成: {len(uploaded)} 成功, {len(failed)} 失败",
        data=HeartRateImageUploadData(uploaded=uploaded, failed=failed),
    )


@router.get(
    "/{report_id}/images",
    response_model=HeartRateImageListResponse,
    summary="获取报告关联的图片列表",
    description="获取指定报告关联的所有心率图片"
)
async def get_report_images(report_id: str) -> HeartRateImageListResponse:
    """
    获取报告关联的图片列表
    
    - **report_id**: 报告ID
    """
    with get_sync_db() as db:
        stmt = (
            select(HeartRateImage)
            .where(HeartRateImage.report_id == report_id)
            .order_by(HeartRateImage.created_at.desc())
        )
        result = db.execute(stmt)
        images = result.scalars().all()
        
        items = [model_to_item(img) for img in images]
        
        return HeartRateImageListResponse(
            code=0,
            message="success",
            data=HeartRateImageListData(images=items, total=len(items)),
        )


@router.delete(
    "/{image_id}",
    response_model=HeartRateImageDeleteResponse,
    summary="删除图片",
    description="删除指定的心率图片"
)
async def delete_image(image_id: int) -> HeartRateImageDeleteResponse:
    """
    删除心率图片
    
    - **image_id**: 图片ID
    
    同时删除文件和数据库记录
    """
    with get_sync_db() as db:
        # 查找图片
        stmt = select(HeartRateImage).where(HeartRateImage.id == image_id)
        result = db.execute(stmt)
        image = result.scalar_one_or_none()
        
        if not image:
            raise HTTPException(status_code=404, detail="图片不存在")
        
        # 删除文件
        if image.image_path and os.path.exists(image.image_path):
            try:
                os.remove(image.image_path)
            except Exception:
                pass  # 文件删除失败不影响数据库记录删除
        
        # 删除数据库记录
        db.delete(image)
        db.commit()
        
        return HeartRateImageDeleteResponse(
            code=0,
            message="删除成功",
            data=None,
        )
