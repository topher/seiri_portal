# Build Cache Recovery Guide

## 🚨 Issue: Next.js Webpack Module Resolution Failure

**Symptoms:**
- `Error: Cannot find module './1682.js'` 
- Repeated webpack chunk resolution failures
- Development server crashes with module not found errors

## 🔍 Root Cause Analysis (5 Whys)

1. **Why**: Dev server failing → Next.js can't find webpack module './1682.js'
2. **Why**: Module not found → Build cache corrupted with missing webpack chunks  
3. **Why**: Cache corrupted → next.config.mjs change triggered incomplete regeneration
4. **Why**: Incomplete regeneration → Hot reload didn't rebuild all dependent modules
5. **Why**: Hot reload failed → Complex dependency graph created unresolved circular references

## 🧹 5S Solution Implementation

### ✅ Quick Recovery (Recommended)
```bash
# Use the fresh script for complete cleanup and restart
npm run fresh
```

### 🔧 Manual Recovery Steps

#### Phase 1: Sort - Remove Corrupted Cache
```bash
# Kill running dev server
pkill -f "next dev" || true

# Remove corrupted Next.js cache
rm -rf .next

# Clear npm cache
npm cache clean --force
```

#### Phase 2: Set - Clean Environment
```bash
# Reinstall dependencies (if needed)
rm -rf node_modules
npm install --legacy-peer-deps
```

#### Phase 3: Shine - Clean Restart
```bash
# Start fresh development server
npm run dev
```

### 🛡️ Prevention Scripts

**Quick Cache Cleanup:**
```bash
npm run cleanup
```

**Full Environment Reset:**
```bash
npm run fresh
```

**Manual Script:**
```bash
./cleanup_build_cache.sh
```

## 📋 Verification Checklist

After recovery, verify:
- [ ] Development server starts without webpack errors
- [ ] No "Cannot find module" errors in console
- [ ] Pages load properly without module resolution issues
- [ ] Hot reload works correctly

## 🔄 Future Prevention

1. **Before changing config files:**
   - Stop development server first
   - Run `npm run cleanup` after config changes
   - Restart with `npm run dev`

2. **If webpack errors occur:**
   - Run `npm run fresh` for complete reset
   - Use `./cleanup_build_cache.sh` for quick cleanup

3. **Complex dependency changes:**
   - Delete `node_modules` and reinstall
   - Use `--legacy-peer-deps` flag for compatibility

## 🎯 Success Criteria

Recovery is successful when:
- ✅ Development server starts cleanly
- ✅ No webpack module resolution errors
- ✅ All pages render properly
- ✅ Hot reload functions correctly
- ✅ Build process completes without errors