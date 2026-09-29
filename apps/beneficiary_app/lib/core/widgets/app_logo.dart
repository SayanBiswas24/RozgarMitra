import 'package:flutter/material.dart';

class AppLogo extends StatelessWidget {
  final double? size;
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;
  final BoxFit fit;

  const AppLogo({
    super.key,
    this.size,
    this.width,
    this.height,
    this.borderRadius,
    this.fit = BoxFit.cover,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveWidth = width ?? size ?? 44.0;
    final effectiveHeight = height ?? size ?? 44.0;
    final effectiveRadius = borderRadius ?? BorderRadius.circular(10);

    return ClipRRect(
      borderRadius: effectiveRadius,
      child: SizedBox(
        width: effectiveWidth,
        height: effectiveHeight,
        child: Image.asset(
          'assets/image/logo.png',
          width: effectiveWidth,
          height: effectiveHeight,
          fit: fit,
          errorBuilder: (context, error, stackTrace) {
            return Image.asset(
              'assets/images/logo.png',
              width: effectiveWidth,
              height: effectiveHeight,
              fit: fit,
              errorBuilder: (_, __, ___) => Container(
                color: Theme.of(context).colorScheme.primaryContainer,
                child: Icon(
                  Icons.handshake_rounded,
                  size: effectiveWidth * 0.55,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
