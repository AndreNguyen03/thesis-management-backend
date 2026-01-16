# 🚀 Quick Start: Hybrid Lecturer Search

## 1️⃣ Re-index Lecturer Profiles (REQUIRED)

```bash
cd thesis-management-backend
npm run index:lecturers
```

## 2️⃣ Test Basic Query

```typescript
// Query với tên + chuyên môn
await lecturerSearchTool.search('Lê Văn Tuấn chuyên AI', { limit: 5 })

// Expected top result: Lê Văn Tuấn với AI expertise
```

## 3️⃣ Monitor Performance

```typescript
// Check cache stats
const stats = lecturerSearchCache.getStats()
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`)
```

## 4️⃣ Tune Parameters (If Needed)

### Adjust Name vs Semantic Weight

**File**: `hybrid-lecturer-search.provider.ts`

```typescript
await hybridSearch.search(query, {
    semanticWeight: 0.6, // ← Increase cho semantic priority
    nameWeight: 0.4 // ← Increase cho name priority
})
```

### Adjust Score Thresholds

**File**: `hybrid-lecturer-search.provider.ts`

```typescript
private getDynamicThreshold(parsed: ParsedQuery): number {
  if (parsed.hasNameEntity) {
    return 0.6  // ← Lower = more results
  }
  return 0.7    // ← Higher = more precision
}
```

## 5️⃣ Clear Cache After Profile Updates

```typescript
lecturerSearchCache.invalidateSearchCache()
```

## 📊 Check Logs

```bash
# Hybrid search
grep "HYBRID SEARCH" logs/app.log

# Reranking
grep "RERANKER" logs/app.log

# Cache
grep "CACHE" logs/app.log
```

## ⚠️ Common Issues

### Issue: No results returned

**Solution**: Lower `scoreThreshold` in hybrid search options

### Issue: Wrong person at top

**Solution**: Check if re-indexing completed. Profile text must have new format.

### Issue: Slow performance

**Solution**: Check cache hit rate. Should be >70%.

## 📚 Full Documentation

- [HYBRID_SEARCH_GUIDE.md](./HYBRID_SEARCH_GUIDE.md) - Complete guide
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Technical details

---

**Ready to go!** 🎉
