#!/usr/bin/env python3
"""
PDF OCR Service API 测试脚本
测试所有API端点的功能
"""

import requests
import time
import sys
import os
from pathlib import Path
from typing import Optional

class Color:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'


def print_success(message):
    print(f"{Color.GREEN}✓ {message}{Color.RESET}")


def print_error(message):
    print(f"{Color.RED}✗ {message}{Color.RESET}")


def print_warning(message):
    print(f"{Color.YELLOW}⚠ {message}{Color.RESET}")


def print_info(message):
    print(f"{Color.BLUE}ℹ {message}{Color.RESET}")


class OcrApiTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.test_results = []
        
    def test_health_check(self) -> bool:
        """测试健康检查接口"""
        try:
            print_info("测试健康检查接口...")
            response = requests.get(f"{self.base_url}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "healthy":
                    print_success("健康检查接口正常")
                    self.test_results.append(("健康检查", True, data))
                    return True
            
            print_error(f"健康检查失败: {response.status_code}")
            self.test_results.append(("健康检查", False, response.text))
            return False
            
        except Exception as e:
            print_error(f"健康检查异常: {str(e)}")
            self.test_results.append(("健康检查", False, str(e)))
            return False
    
    def test_extract_text(self, pdf_path: str) -> bool:
        """测试文字提取接口"""
        try:
            if not os.path.exists(pdf_path):
                print_error(f"测试PDF文件不存在: {pdf_path}")
                return False
            
            print_info(f"测试文字提取接口，使用文件: {pdf_path}")
            with open(pdf_path, 'rb') as f:
                files = {'file': f}
                response = requests.post(f"{self.base_url}/extract", files=files, timeout=60)
            
            if response.status_code == 200:
                data = response.json()
                print_success(f"文字提取成功，处理页数: {data.get('total_pages', 0)}")
                print_success(f"提取文字预览: {data.get('extracted_text', '')[:100]}...")
                self.test_results.append(("文字提取", True, data))
                return True
            else:
                print_error(f"文字提取失败: {response.status_code} - {response.text}")
                self.test_results.append(("文字提取", False, response.text))
                return False
                
        except Exception as e:
            print_error(f"文字提取异常: {str(e)}")
            self.test_results.append(("文字提取", False, str(e)))
            return False
    
    def test_status_check(self, process_id: str = "test_process_123") -> bool:
        """测试状态查询接口"""
        try:
            print_info("测试状态查询接口...")
            response = requests.get(f"{self.base_url}/status/{process_id}", timeout=10)
            
            if response.status_code == 404:
                print_success("状态查询接口正常 (404表示任务不存在，符合预期)")
                self.test_results.append(("状态查询", True, "404 - 任务不存在"))
                return True
            elif response.status_code == 200:
                data = response.json()
                print_success("状态查询接口正常")
                self.test_results.append(("状态查询", True, data))
                return True
            else:
                print_error(f"状态查询失败: {response.status_code}")
                self.test_results.append(("状态查询", False, response.text))
                return False
                
        except Exception as e:
            print_error(f"状态查询异常: {str(e)}")
            self.test_results.append(("状态查询", False, str(e)))
            return False
    
    def test_api_docs(self) -> bool:
        """测试API文档"""
        endpoints = [
            "/docs",
            "/redoc"
        ]
        results = []
        
        print_info("测试API文档...")
        for endpoint in endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                if response.status_code == 200:
                    print_success(f"API文档可用: {endpoint}")
                    results.append(True)
                else:
                    print_error(f"API文档不可用: {endpoint} (状态码: {response.status_code})")
                    results.append(False)
            except Exception as e:
                print_error(f"API文档测试失败 {endpoint}: {str(e)}")
                results.append(False)
        
        overall = all(results)
        self.test_results.append(("API文档", overall, results))
        return overall
    
    def run_all_tests(self, pdf_path: Optional[str] = None):
        """运行所有测试"""
        print_info("=" * 60)
        print_info("PDF OCR Service API 测试开始")
        print_info("=" * 60)
        
        # 测试1: 健康检查
        self.test_health_check()
        time.sleep(1)
        
        # 测试2: API文档
        self.test_api_docs()
        time.sleep(1)
        
        # 测试3: 状态查询
        self.test_status_check()
        time.sleep(1)
        
        # 测试4: 文字提取（如果提供了PDF文件）
        if pdf_path and os.path.exists(pdf_path):
            self.test_extract_text(pdf_path)
        else:
            print_warning("未提供PDF文件，跳过文字提取测试")
            self.test_results.append(("文字提取", None, "需要PDF文件进行测试"))
        
        # 打印测试总结
        self.print_test_summary()
        
        # 根据测试结果决定是否退出
        if not self.should_service_continue():
            sys.exit(1)
    
    def print_test_summary(self):
        """打印测试总结"""
        print_info("\n" + "=" * 60)
        print_info("API 测试总结")
        print_info("=" * 60)
        
        for test_name, result, details in self.test_results:
            status = "通过" if result is True else ("失败" if result is False else "跳过")
            color = Color.GREEN if result is True else (Color.RED if result is False else Color.YELLOW)
            print(f"{color}{test_name}: {status}{Color.RESET}")
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for _, result, _ in self.test_results if result is True)
        failed_tests = sum(1 for _, result, _ in self.test_results if result is False)
        
        print_info(f"\n总计: {total_tests} 项测试")
        print_success(f"通过: {passed_tests} 项")
        print_error(f"失败: {failed_tests} 项")
        
        success_rate = passed_tests / total_tests * 100 if total_tests > 0 else 0
        if success_rate >= 60:
            print_success(f"成功率: {success_rate:.1f}%")
        else:
            print_error(f"成功率: {success_rate:.1f}%")
    
    def should_service_continue(self):
        """根据测试结果决定服务是否应该继续运行"""
        critical_tests = ["健康检查"]
        failures = []
        
        for test_name, result, _ in self.test_results:
            if test_name in critical_tests and result is False:
                failures.append(test_name)
        
        if failures:
            print_error(f"\u5173键测试{'、'.join(failures)}失败，服务不能正常运行")
            return False
        
        return True


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='PDF OCR Service API Tester')
    parser.add_argument('--base-url', '-u', default='http://localhost:8000', 
                       help='API基础URL (默认: http://localhost:8000)')
    parser.add_argument('--pdf-file', '-f', help='测试用的PDF文件路径')
    parser.add_argument('--skip-requirements', action='store_true', 
                       help='跳过要求检查')
    
    args = parser.parse_args()
    
    # 检查PDF文件
    if args.pdf_file:
        if not os.path.exists(args.pdf_file):
            print_error(f"PDF文件不存在: {args.pdf_file}")
            sys.exit(1)
        else:
            print_info(f"将使用PDF文件测试: {args.pdf_file}")
    else:
        print_info("提示: 提供PDF文件可进行文字提取测试")
        print_info("例如: python test_api.py -f sample.pdf")
    
    # 创建测试器并运行测试
    tester = OcrApiTester(base_url=args.base_url)
    
    print_info(f"开始测试服务: {args.base_url}")
    print_info("=" * 60)
    
    try:
        tester.run_all_tests(pdf_path=args.pdf_file)
    except KeyboardInterrupt:
        print_warning("\n测试被用户中断")
        sys.exit(1)
    except Exception as e:
        print_error(f"测试执行失败: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()