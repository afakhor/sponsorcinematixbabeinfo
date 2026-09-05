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
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(),
      home: const GlobePreviewPage(),
    );
  }
}

class GlobePreviewPage extends StatefulWidget {
  const GlobePreviewPage({super.key});

  @override
  State<GlobePreviewPage> createState() => _GlobePreviewPageState();
}

class _GlobePreviewPageState extends State<GlobePreviewPage>
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

  Future<ui.Image> _loadImage(String assetPath) async {
    final data = await rootBundle.load(assetPath);
    final bytes = data.buffer.asUint8List();

    final codec = await ui.instantiateImageCodec(bytes);
    final frame = await codec.getNextFrame();

    return frame.image;
  }

  @override
  void dispose() {
    _animationController.dispose();

    for (final image in _images.values) {
      image.dispose();
    }

    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_errorMessage != null) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'Shader gagal dimuat:\n\n$_errorMessage',
              style: const TextStyle(
                color: Colors.redAccent,
                fontSize: 14,
              ),
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
                beatPulse: 0.0,
                rotation: _animationController.value * 0.8,
              ),
              child: const SizedBox.expand(),
            ),
          ),
        ),
      ),
    );
  }
}
