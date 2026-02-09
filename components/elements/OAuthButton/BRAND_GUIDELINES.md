# OAuth Button Brand Guidelines Implementation

## Google Sign In Button

### Brand Guidelines
- **Source**: [Google Brand Guidelines](https://developers.google.com/identity/branding-guidelines)
- **Required**: Mengikuti guidelines ini **WAJIB** untuk app verification

### Requirements
1. **Logo Google "G"**:
   - ✅ Harus menggunakan logo resmi Google (bukan dari icon library)
   - ✅ Harus menggunakan warna standar (tidak boleh custom color)
   - ✅ Logo harus di background putih/light
   - ❌ Tidak boleh mengubah ukuran atau warna logo
   - ❌ Tidak boleh menggunakan monochrome version

2. **Button Text**:
   - ✅ "Sign in with Google", "Sign up with Google", atau "Continue with Google"
   - ✅ Bisa dilokalisasi ke bahasa aplikasi
   - ✅ Current: "Masuk dengan Google" ✅

3. **Button Styling**:
   - ✅ Background: Light (#FFFFFF), Dark (#131314), atau Neutral (#F2F2F2)
   - ✅ Font: Roboto Medium, 14/20
   - ✅ Padding: Sesuai platform (Android/iOS/Web)

### Logo Standalone
Logo Google "G" standalone tersedia di:
- **URL**: https://developers.google.com/static/identity/images/g-logo.png
- **Download**: Termasuk dalam [signin-assets.zip](https://developers.google.com/static/identity/images/signin-assets.zip)

### Implementation Status
- ⚠️ **Current**: Menggunakan FontAwesome icon sebagai fallback
- ✅ **Required**: Ganti dengan logo Google "G" resmi standalone

### Steps to Fix
1. Download logo Google "G" standalone dari link di atas
2. Simpan ke: `assets/images/google-login/g-logo.png`
3. Update `utils/images.ts` untuk menambahkan logo
4. Update `OAuthButton.tsx` untuk menggunakan Image component dengan logo resmi

---

## Apple Sign In Button

### Brand Guidelines
- **Source**: [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)
- **Required**: Mengikuti guidelines ini untuk konsistensi dan approval

### Requirements
1. **Button Styles**:
   - ✅ Black (untuk light backgrounds)
   - ✅ White (untuk dark backgrounds)
   - ✅ White with outline

2. **Logo Apple**:
   - ✅ Harus menggunakan logo Apple resmi
   - ✅ Current: Menggunakan FontAwesome dengan theme-aware color ✅

3. **Button Text**:
   - ✅ "Sign in with Apple", "Sign up with Apple", atau "Continue with Apple"
   - ✅ Current: "Masuk dengan Apple" ✅

### Implementation Status
- ✅ **Current**: Menggunakan FontAwesome dengan styling sesuai Apple HIG
- ✅ **Color**: Black untuk light mode, White untuk dark mode (sesuai guidelines)

---

## Current Implementation

### Google Logo
```typescript
// TODO: Ganti dengan logo resmi
<ImageComponent
  source={require('@/assets/images/google-login/g-logo.png')}
  width={iconSize * 0.8}
  height={iconSize * 0.8}
  contentFit="contain"
/>
```

### Apple Logo
```typescript
// Menggunakan FontAwesome dengan theme-aware color
<FontAwesome5 
  name="apple" 
  size={iconSize} 
  color={isDark ? '#FFFFFF' : '#000000'} 
  solid 
/>
```

---

## Next Steps

1. **Download Google Logo "G" standalone**:
   - URL: https://developers.google.com/static/identity/images/g-logo.png
   - Simpan ke: `assets/images/google-login/g-logo.png`

2. **Update `utils/images.ts`**:
   ```typescript
   googleLogo: require('@/assets/images/google-login/g-logo.png'),
   ```

3. **Update `OAuthButton.tsx`**:
   - Ganti FontAwesome Google icon dengan Image component menggunakan logo resmi
   - Pastikan background putih sesuai guidelines

4. **Verify Compliance**:
   - ✅ Logo Google menggunakan warna standar
   - ✅ Logo di background putih
   - ✅ Tidak mengubah ukuran/warna logo
   - ✅ Button text sesuai guidelines

---

## References

- [Google Brand Guidelines](https://developers.google.com/identity/branding-guidelines)
- [Apple HIG - Sign in with Apple](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)
- [Google Sign In Assets Download](https://developers.google.com/static/identity/images/signin-assets.zip)
