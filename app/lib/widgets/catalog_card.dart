import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../models/catalog_item.dart';
import '../../services/calendar_service.dart';

class CatalogCard extends StatelessWidget {
  final CatalogItem item;
  final bool isTracked;
  final VoidCallback onSubscribe;
  final VoidCallback? onTap;

  const CatalogCard({
    super.key,
    required this.item,
    required this.isTracked,
    required this.onSubscribe,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppConstants.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // İkon ve Rozet
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppConstants.slate50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppConstants.border),
                    ),
                    alignment: Alignment.center,
                    child: Text(item.icon, style: const TextStyle(fontSize: 20)),
                  ),
                  if (item.badge != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppConstants.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppConstants.primary.withValues(alpha: 0.2)),
                      ),
                      child: Text(
                        item.badge!,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppConstants.primary,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),

              // Başlık
              Text(
                item.title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: AppConstants.textPrimary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),

              // Açıklama
              Text(
                item.description,
                style: TextStyle(
                  fontSize: 11,
                  color: AppConstants.textSecondary,
                  height: 1.4,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 10),

              // Etiketler
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: item.tags
                    .take(3)
                    .map(
                      (tag) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppConstants.slate100,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '#$tag',
                          style: const TextStyle(fontSize: 9, color: AppConstants.slate700, fontWeight: FontWeight.w600),
                        ),
                      ),
                    )
                    .toList(),
              ),

              const Spacer(),
              const SizedBox(height: 12),

              // Alt Aksiyon: Siteye Git & Takibe Al
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  GestureDetector(
                    onTap: () => CalendarService.openUrl(item.url),
                    child: Row(
                      children: [
                        Text(
                          'Siteye Git',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade500,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 2),
                        Icon(Icons.open_in_new_rounded, size: 12, color: Colors.grey.shade500),
                      ],
                    ),
                  ),
                  if (isTracked)
                    OutlinedButton.icon(
                      onPressed: onSubscribe,
                      icon: const Icon(Icons.check, size: 12, color: AppConstants.emerald700),
                      label: const Text(
                        'Takipte',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppConstants.emerald700,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: AppConstants.emerald50,
                        side: const BorderSide(color: AppConstants.emerald200),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        visualDensity: VisualDensity.compact,
                      ),
                    )
                  else
                    ElevatedButton.icon(
                      onPressed: onSubscribe,
                      icon: const Icon(Icons.add, size: 14),
                      label: const Text('Takip Et', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppConstants.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        visualDensity: VisualDensity.compact,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
