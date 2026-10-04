import 'package:flutter/material.dart';
import '../core/constants.dart';
import '../models/user_profile.dart';
import '../services/firestore_service.dart';

class ProfileDialog extends StatefulWidget {
  final String userId;
  final String userEmail;
  final VoidCallback? onProfileUpdated;

  const ProfileDialog({
    super.key,
    required this.userId,
    required this.userEmail,
    this.onProfileUpdated,
  });

  @override
  State<ProfileDialog> createState() => _ProfileDialogState();
}

class _ProfileDialogState extends State<ProfileDialog> {
  final FirestoreService _firestoreService = FirestoreService();
  final _uniCtrl = TextEditingController();
  final _deptCtrl = TextEditingController();

  bool _isLoading = true;
  bool _isSaving = false;
  String _selectedGrade = '1. Sınıf';
  final Set<String> _selectedInterests = {};

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _uniCtrl.dispose();
    _deptCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    final profile = await _firestoreService.getUserProfile(widget.userId);
    if (mounted) {
      setState(() {
        _uniCtrl.text = profile.university;
        _deptCtrl.text = profile.department;
        _selectedGrade = UserProfile.availableGrades.contains(profile.grade)
            ? profile.grade
            : '1. Sınıf';
        _selectedInterests.addAll(profile.interests);
        _isLoading = false;
      });
    }
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      final updated = UserProfile(
        university: _uniCtrl.text.trim(),
        department: _deptCtrl.text.trim(),
        grade: _selectedGrade,
        interests: _selectedInterests.toList(),
      );

      await _firestoreService.saveUserProfile(widget.userId, updated);

      if (mounted) {
        Navigator.of(context).pop();
        if (widget.onProfileUpdated != null) widget.onProfileUpdated!();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Profil bilgileriniz ve ilgi alanlarınız güncellendi!'),
            backgroundColor: AppConstants.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Kayıt başarısız: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _isLoading
              ? const SizedBox(
                  height: 240,
                  child: Center(child: CircularProgressIndicator()),
                )
              : SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Başlık
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppConstants.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.person_rounded, color: AppConstants.primary, size: 24),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Öğrenci Profili & İlgi Alanları',
                                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppConstants.textPrimary),
                                ),
                                Text(
                                  widget.userEmail,
                                  style: const TextStyle(fontSize: 12, color: AppConstants.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, size: 20),
                            onPressed: () => Navigator.of(context).pop(),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Üniversite & Bölüm Bilgileri
                      const Text('Üniversite & Bölüm Bilgisi', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),

                      TextField(
                        controller: _uniCtrl,
                        decoration: InputDecoration(
                          labelText: 'Üniversite Adı',
                          hintText: 'Örn: Çukurova Üniversitesi, İTÜ, ODTÜ...',
                          prefixIcon: const Icon(Icons.school_outlined, size: 18),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                      const SizedBox(height: 10),

                      Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: TextField(
                              controller: _deptCtrl,
                              decoration: InputDecoration(
                                labelText: 'Bölüm',
                                hintText: 'Bilgisayar Mühendisliği...',
                                prefixIcon: const Icon(Icons.computer_rounded, size: 18),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            flex: 2,
                            child: DropdownButtonFormField<String>(
                              initialValue: _selectedGrade,
                              decoration: InputDecoration(
                                labelText: 'Sınıf',
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              items: UserProfile.availableGrades.map((g) {
                                return DropdownMenuItem(value: g, child: Text(g, style: const TextStyle(fontSize: 12)));
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) setState(() => _selectedGrade = val);
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // İlgi Alanları
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('İlgi Alanlarım (Önerilen Etkinlikler İçin)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                          Text(
                            '${_selectedInterests.length} seçili',
                            style: const TextStyle(fontSize: 11, color: AppConstants.primary, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Seçtiğiniz ilgi alanlarına uygun hackathon ve kamplar ana akışınızda "Sana Özel" etiketiyle öne çıkarılır.',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade600, height: 1.4),
                      ),
                      const SizedBox(height: 12),

                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: UserProfile.availableInterests.map((interest) {
                          final isSelected = _selectedInterests.contains(interest);
                          return FilterChip(
                            selected: isSelected,
                            label: Text(interest),
                            labelStyle: TextStyle(
                              fontSize: 11,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              color: isSelected ? Colors.white : AppConstants.textPrimary,
                            ),
                            backgroundColor: Colors.white,
                            selectedColor: AppConstants.primary,
                            checkmarkColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                              side: BorderSide(color: isSelected ? AppConstants.primary : AppConstants.border),
                            ),
                            onSelected: (selected) {
                              setState(() {
                                if (selected) {
                                  _selectedInterests.add(interest);
                                } else {
                                  _selectedInterests.remove(interest);
                                }
                              });
                            },
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 24),

                      // Kaydet Butonu
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: ElevatedButton(
                          onPressed: _isSaving ? null : _save,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppConstants.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: _isSaving
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : const Text('Profilimi Kaydet', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                        ),
                      ),
                    ],
                  ),
                ),
        ),
      ),
    );
  }
}
