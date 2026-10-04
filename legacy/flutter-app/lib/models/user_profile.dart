class UserProfile {
  final String university;
  final String department;
  final String grade;
  final List<String> interests;

  const UserProfile({
    this.university = '',
    this.department = '',
    this.grade = '1. Sınıf',
    this.interests = const [],
  });

  static const List<String> availableGrades = [
    'Hazırlık',
    '1. Sınıf',
    '2. Sınıf',
    '3. Sınıf',
    '4. Sınıf',
    'Yüksek Lisans / Doktora',
    'Mezun',
  ];

  static const List<String> availableInterests = [
    'Yapay Zeka & Veri Bilimi',
    'Ödüllü Hackathonlar',
    'Yaz Stajı & Kariyer',
    'Web & Mobil Geliştirme',
    'Siber Güvenlik',
    'Algoritma & Problem Çözme',
    'Oyun Geliştirme (Game Dev)',
    'DevOps & Bulut Bilişim',
  ];

  factory UserProfile.fromMap(Map<String, dynamic>? data) {
    if (data == null) return const UserProfile();
    return UserProfile(
      university: data['university'] ?? '',
      department: data['department'] ?? '',
      grade: data['grade'] ?? '1. Sınıf',
      interests: (data['interests'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'university': university,
      'department': department,
      'grade': grade,
      'interests': interests,
      'updatedAt': DateTime.now().toIso8601String(),
    };
  }

  UserProfile copyWith({
    String? university,
    String? department,
    String? grade,
    List<String>? interests,
  }) {
    return UserProfile(
      university: university ?? this.university,
      department: department ?? this.department,
      grade: grade ?? this.grade,
      interests: interests ?? this.interests,
    );
  }
}
