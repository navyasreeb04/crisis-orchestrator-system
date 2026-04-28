import 'package:flutter/material.dart';

import '../services/auth_service.dart';

class PhoneAuthScreen extends StatefulWidget {
  const PhoneAuthScreen({super.key, required this.authService});

  final AuthService authService;

  @override
  State<PhoneAuthScreen> createState() => _PhoneAuthScreenState();
}

class _PhoneAuthScreenState extends State<PhoneAuthScreen> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  String? _verificationId;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    setState(() {
      _busy = true;
      _error = null;
    });

    await widget.authService.verifyPhoneNumber(
      phoneNumber: _phoneController.text.trim(),
      codeSent: (verificationId, _) {
        if (!mounted) {
          return;
        }
        setState(() {
          _verificationId = verificationId;
          _busy = false;
        });
      },
      onFailed: (message) {
        if (!mounted) {
          return;
        }
        setState(() {
          _busy = false;
          _error = message;
        });
      },
      onVerified: () {
        if (!mounted) {
          return;
        }
        setState(() {
          _busy = false;
        });
      },
    );
  }

  Future<void> _verifyOtp() async {
    if (_verificationId == null) {
      setState(() {
        _error = 'Request a verification code first.';
      });
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      await widget.authService.signInWithOtp(
        verificationId: _verificationId!,
        smsCode: _otpController.text.trim(),
      );
    } catch (error) {
      setState(() {
        _error = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: <Color>[Color(0xFFF9EFE7), Color(0xFFF4F1EB), Color(0xFFFCE8D7)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        'Crisis Orchestrator',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Sign in with your phone number to reach the SOS workspace.',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 24),
                      TextField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Phone number',
                          hintText: '+91 9876543210',
                        ),
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: _busy ? null : _sendOtp,
                        child: Text(_busy ? 'Sending...' : 'Send OTP'),
                      ),
                      const SizedBox(height: 24),
                      TextField(
                        controller: _otpController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'OTP code'),
                      ),
                      const SizedBox(height: 16),
                      FilledButton.tonal(
                        onPressed: _busy ? null : _verifyOtp,
                        child: Text(_busy ? 'Verifying...' : 'Verify OTP'),
                      ),
                      if (_error != null) ...<Widget>[
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          style: const TextStyle(color: Colors.red),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
