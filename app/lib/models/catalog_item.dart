class CatalogItem {
  final String id;
  final String title;
  final String category;
  final String description;
  final String url;
  final List<String> tags;
  final String? badge;
  final String icon;

  CatalogItem({
    required this.id,
    required this.title,
    required this.category,
    required this.description,
    required this.url,
    required this.tags,
    this.badge,
    required this.icon,
  });

  factory CatalogItem.fromJson(Map<String, dynamic> json) {
    return CatalogItem(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      category: json['category'] ?? 'general',
      description: json['description'] ?? '',
      url: json['url'] ?? '',
      tags: (json['tags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      badge: json['badge'],
      icon: json['icon'] ?? '📌',
    );
  }
}

class CatalogCategory {
  final String id;
  final String name;
  final String icon;

  CatalogCategory({
    required this.id,
    required this.name,
    required this.icon,
  });

  factory CatalogCategory.fromJson(Map<String, dynamic> json) {
    return CatalogCategory(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      icon: json['icon'] ?? '',
    );
  }
}
