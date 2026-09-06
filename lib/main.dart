import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home:  GlobePreviewPage(),
    );
  }
}

class GlobePreviewPage extends StatefulWidget {
  const GlobePreviewPage({super.key});

  @override
  State<GlobePreviewPage> createState() =>
      _GlobePreviewPageState();
}

class _GlobePreviewPageState
    extends State<GlobePreviewPage>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animationController;

  ui.FragmentProgram? _fragmentProgram;

  final Map<String, ui.Image> _images = {};

  bool _isReady = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();

    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(days: 1),
    )..addListener(() {
        if (mounted) {
          setState(() {});
        }
      });

    _loadShaderAndImages();
  }

  Future<void> _loadShaderAndImages() async {
    try {
      final program = await ui.FragmentProgram.fromAsset(
        'assets/shaders/globe.frag',
      );

      final loadedImages = <String, ui.Image>{
        'background': await _loadImage(
          'assets/images/bg.png',
        ),
        'globeText': await _loadImage(
          'assets/images/globe_text.png',
        ),
        'bubble': await _loadImage(
          'assets/images/bubble.png',
        ),
        'atmosphere': await _loadImage(
          'assets/images/atmosphere.png',
        ),
        'plasma': await _loadImage(
          'assets/images/plasma.png',
        ),
        'blackhole': await _loadImage(
          'assets/images/blackhole.png',
        ),
        'lightning': await _loadImage(
          'assets/images/lightning.png',
        ),
        'solarWind': await _loadImage(
          'assets/images/solar_wind.png',
        ),
        'starWind': await _loadImage(
          'assets/images/star_wind.png',
        ),
      };

      if (!mounted) {
        return;
      }

      setState(() {
        _fragmentProgram = program;
        _images.addAll(loadedImages);
        _isReady = true;
      });

      _animationController.repeat();
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _errorMessage = error.toString();
      });
    }
  }

  Future<ui.Image> _loadImage(String path) async {
    final data = await rootBundle.load(path);
    final codec = await ui.instantiateImageCodec(
      data.buffer.asUint8List(),
    );

    final frame = await codec.getNextFrame();

    return frame.image;
  }

  double _fakeBeatPulse() {
    final seconds =
        _animationController.value * 60.0;

    final wave = math.sin(
      seconds * 2.0 * math.pi * 1.2,
    );

    return ((wave + 1.0) * 0.5).clamp(
      0.0,
      1.0,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_errorMessage != null) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Text(
            'Shader gagal dimuat:\n\n$_errorMessage',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.redAccent,
            ),
          ),
        ),
      );
    }

    if (!_isReady || _fragmentProgram == null) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Center(
          child: AspectRatio(
            aspectRatio: 9 / 16,
            child: CustomPaint(
              painter: GlobePainter(
                fragmentProgram: _fragmentProgram!,
                images: _images,
                time: _animationController.value * 60.0,
                beatPulse: _fakeBeatPulse(),
                rotation: _animationController.value * 0.8,
              ),
              child: const SizedBox.expand(),
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();

    for (final image in _images.values) {
      image.dispose();
    }

    super.dispose();
  }
}

class GlobePainter extends CustomPainter {
  GlobePainter({
    required this.fragmentProgram,
    required this.images,
    required this.time,
    required this.beatPulse,
    required this.rotation,
  });

  final ui.FragmentProgram fragmentProgram;
  final Map<String, ui.Image> images;

  final double time;
  final double beatPulse;
  final double rotation;

  @override
  void paint(Canvas canvas, Size size) {
    final shader =
        fragmentProgram.fragmentShader();

    /*
     * Uniform float shader:
     *
     * 0 → uSize.x
     * 1 → uSize.y
     * 2 → uTime
     * 3 → uBeatPulse
     * 4 → uRotation
     * 5 → uGlobeOpacity
     */
    shader
      ..setFloat(0, size.width)
      ..setFloat(1, size.height)
      ..setFloat(2, time)
      ..setFloat(3, beatPulse)
      ..setFloat(4, rotation)
      ..setFloat(5, 0.95);

    /*
     * Uniform sampler shader:
     *
     * 0 → uBackground
     * 1 → uGlobeText
     * 2 → uBubble
     * 3 → uAtmosphere
     * 4 → uPlasma
     * 5 → uBlackhole
     * 6 → uLightning
     * 7 → uSolarWind
     * 8 → uStarWind
     */
    shader
      ..setImageSampler(
        0,
        images['background']!,
      )
      ..setImageSampler(
        1,
        images['globeText']!,
      )
      ..setImageSampler(
        2,
        images['bubble']!,
      )
      ..setImageSampler(
        3,
        images['atmosphere']!,
      )
      ..setImageSampler(
        4,
        images['plasma']!,
      )
      ..setImageSampler(
        5,
        images['blackhole']!,
      )
      ..setImageSampler(
        6,
        images['lightning']!,
      )
      ..setImageSampler(
        7,
        images['solarWind']!,
      )
      ..setImageSampler(
        8,
        images['starWind']!,
      );

    final paint = Paint()
      ..shader = shader
      ..isAntiAlias = true
      ..filterQuality = FilterQuality.high;

    canvas.drawRect(
      Offset.zero & size,
      paint,
    );
  }

  @override
  bool shouldRepaint(
    covariant GlobePainter oldDelegate,
  ) {
    return oldDelegate.time != time ||
        oldDelegate.beatPulse != beatPulse ||
        oldDelegate.rotation != rotation ||
        oldDelegate.fragmentProgram !=
            fragmentProgram;
  }
}
