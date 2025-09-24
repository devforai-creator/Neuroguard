# Changelog

모든 눈에 띄는 변경 사항은 이 파일에서 관리합니다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)과 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)을 따르려 노력합니다.

## [0.1.0] - 2025-09-24
### Added
- MV3 `manifest.json`과 기본 옵션 페이지를 포함한 프로젝트 구조 초기화.
- `content.js`를 통해 갈등 키워드 필터링, 클릭 인터셉트, 홈 피드 숨김 토글 구현.
- `blocker.css`로 썸네일 흐림 및 모달 UI 스타일 작성.
- `service_worker.js` 일일 로그 정리 및 30일 보존 로직 추가.
- 옵션 페이지에서 키워드·지연시간·로그 내보내기/초기화를 지원하는 `options.js`, `options.css`, `options.html` 작성.
