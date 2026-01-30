/**
 * ImageUploader - 图片上传组件
 * 版本: v1.0
 * 
 * 功能：
 * - 拖拽上传区域
 * - 文件格式验证（PNG/JPG/JPEG）
 * - 上传进度显示
 * - 已上传图片预览
 * - 提取状态显示
 */

import React, { useState, useRef, useCallback } from 'react';
import { reportApi } from '../services/api';
import type { HeartRateImage } from '../types';

interface ImageUploaderProps {
  reportId: string;
  onUploadSuccess?: (images: HeartRateImage[]) => void;
  maxFiles?: number;
  acceptedFormats?: string[];
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  reportId,
  onUploadSuccess,
  maxFiles = 5,
  acceptedFormats = ['image/png', 'image/jpeg', 'image/jpg'],
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewFiles, setPreviewFiles] = useState<{ file: File; preview: string }[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 验证文件 ---
  const validateFiles = useCallback((files: FileList | File[]): File[] => {
    const validFiles: File[] = [];
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      // 检查文件格式
      if (!acceptedFormats.includes(file.type)) {
        setError(`不支持的文件格式: ${file.name}。请上传 PNG 或 JPG 格式的图片。`);
        continue;
      }
      
      // 检查文件大小 (最大 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`文件过大: ${file.name}。请上传小于 10MB 的图片。`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    // 检查文件数量限制
    if (validFiles.length > maxFiles) {
      setError(`最多只能上传 ${maxFiles} 张图片。`);
      return validFiles.slice(0, maxFiles);
    }
    
    return validFiles;
  }, [acceptedFormats, maxFiles]);

  // --- 处理文件选择 ---
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    
    const validFiles = validateFiles(files);
    if (validFiles.length === 0) return;
    
    // 创建预览
    const previews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPreviewFiles(previews);
    
    // 上传文件
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);
      
      const response = await reportApi.uploadHeartRateImages(reportId, validFiles);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (response.code === 0 && response.data) {
        // 清理预览 URL
        previews.forEach(p => URL.revokeObjectURL(p.preview));
        setPreviewFiles([]);
        
        // 后端返回 uploaded 数组
        onUploadSuccess?.(response.data.uploaded);
        
        // 如果有失败的文件，显示提示
        if (response.data.failed && response.data.failed.length > 0) {
          setError(`部分文件上传失败: ${response.data.failed.join(', ')}`);
        }
      } else {
        setError(response.message || '上传失败');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError('上传失败，请稍后重试');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [reportId, validateFiles, onUploadSuccess]);

  // --- 拖拽事件处理 ---
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  // --- 点击上传 ---
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // 重置 input 以允许重复上传同一文件
    e.target.value = '';
  };

  // --- 移除预览文件 ---
  const removePreviewFile = (index: number) => {
    setPreviewFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  return (
    <div className="space-y-3">
      {/* 上传区域 */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
          ${isDragging 
            ? 'border-[#42ff9e] bg-[#42ff9e]/5' 
            : 'border-white/10 hover:border-white/20 bg-[#1a1a1a]'}
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
        
        {isUploading ? (
          // 上传中状态
          <div className="py-4">
            <div className="size-10 mx-auto border-2 border-[#42ff9e] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-white/60">上传中...</p>
            <div className="mt-3 mx-auto max-w-[200px]">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#42ff9e] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-white/40 mt-1">{uploadProgress}%</p>
            </div>
          </div>
        ) : (
          // 默认状态
          <>
            <div className={`
              size-12 mx-auto rounded-full flex items-center justify-center mb-3 transition-colors
              ${isDragging ? 'bg-[#42ff9e]/20' : 'bg-white/5'}
            `}>
              <span className={`material-symbols-outlined text-2xl ${isDragging ? 'text-[#42ff9e]' : 'text-white/40'}`}>
                cloud_upload
              </span>
            </div>
            <p className={`text-sm font-medium ${isDragging ? 'text-[#42ff9e]' : 'text-white/60'}`}>
              {isDragging ? '释放文件以上传' : '拖拽或点击上传心率截图'}
            </p>
            <p className="text-[10px] text-white/30 mt-1">
              支持 PNG、JPG 格式，最多 {maxFiles} 张，单张不超过 10MB
            </p>
          </>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg p-3">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-white/40 hover:text-white"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* 预览文件 */}
      {previewFiles.length > 0 && !isUploading && (
        <div className="grid grid-cols-3 gap-2">
          {previewFiles.map((item, index) => (
            <div key={index} className="relative group">
              <img 
                src={item.preview} 
                alt={`预览 ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-white/10"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePreviewFile(index);
                }}
                className="absolute top-1 right-1 size-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="material-symbols-outlined text-white text-xs">close</span>
              </button>
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[8px] text-white/60 truncate max-w-[90%]">
                {item.file.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 提示信息 */}
      <div className="flex items-center gap-2 text-[10px] text-white/30">
        <span className="material-symbols-outlined text-[10px]">info</span>
        <span>上传手表或运动 App 的心率截图，AI 将自动提取心率数据用于分析</span>
      </div>
    </div>
  );
};

export default ImageUploader;
