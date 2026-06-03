// === Helper Utilities ===
// Các hàm tiện ích nhỏ dùng chung.

// pluralize: trả về dạng số nhiều/số ít của danh từ (tiếng Anh)
export function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural || singular + 's'
}

// formatDate: định dạng timestamp thành ngày tháng kiểu "Jan 1, 2025"
export function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// cn: kết hợp các class name, loại bỏ falsy values
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

// generateId: tạo ID ngẫu nhiên ngắn (base36 timestamp + random)
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
