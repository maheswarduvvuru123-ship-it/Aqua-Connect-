import 'package:flutter/material.dart';
import '../utils/theme.dart';

/// Custom painter for an organic water droplet with a smooth, continuous curve at the bottom
class WaterDropPainter extends CustomPainter {
  final Color color;

  const WaterDropPainter({this.color = Colors.white});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill
      ..isAntiAlias = true;

    final cx = size.width * 0.5;
    final dropW = size.width;
    final dropH = size.height;
    const topY = 0.0;
    final botY = dropH;
    final r = dropW * 0.5;
    final bulbCenterY = botY - r;

    final path = Path();
    final apex = Offset(cx, topY);

    // Start at top apex
    path.moveTo(apex.dx, apex.dy);

    // Right curve flowing gracefully to the right side of the bottom bulb
    final cp1Right = Offset(cx + (r * 0.15), topY + (dropH * 0.28));
    final cp2Right = Offset(cx + r, bulbCenterY - (r * 0.45));
    final pRight = Offset(cx + r, bulbCenterY);
    path.cubicTo(cp1Right.dx, cp1Right.dy, cp2Right.dx, cp2Right.dy, pRight.dx, pRight.dy);

    // Bottom arc: perfect round semicircle curve around the end
    path.arcToPoint(
      Offset(cx - r, bulbCenterY),
      radius: Radius.circular(r),
      clockwise: true,
    );

    // Left curve flowing back to top apex
    final cp1Left = Offset(cx - r, bulbCenterY - (r * 0.45));
    final cp2Left = Offset(cx - (r * 0.15), topY + (dropH * 0.28));
    path.cubicTo(cp1Left.dx, cp1Left.dy, cp2Left.dx, cp2Left.dy, apex.dx, apex.dy);

    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Official AquaConnect Logo widget matching the brand design (Circle with curved droplet)
class AquaConnectLogo extends StatelessWidget {
  final double size;
  final bool withShadow;

  const AquaConnectLogo({
    super.key,
    this.size = 80,
    this.withShadow = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          colors: [AquaTheme.primary, AquaTheme.secondary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: withShadow
            ? [
                BoxShadow(
                  color: AquaTheme.primary.withValues(alpha: 0.35),
                  blurRadius: size * 0.22,
                  offset: Offset(0, size * 0.08),
                ),
              ]
            : null,
      ),
      child: Center(
        child: Padding(
          padding: EdgeInsets.only(top: size * 0.02),
          child: CustomPaint(
            size: Size(size * 0.44, size * 0.56),
            painter: const WaterDropPainter(color: Colors.white),
          ),
        ),
      ),
    );
  }
}
