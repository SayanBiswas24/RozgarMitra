import 'package:beneficiary_app/theme/app_colors.dart';
import 'package:flutter/material.dart';

class AssistantScreen extends StatefulWidget {
  const AssistantScreen({super.key});

  @override
  State<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends State<AssistantScreen> {
  bool _isListening = false;

  final List<ChatMessage> _messages = [
    const ChatMessage(
      message:
          'Namaste! I am Saathi. I can help you find suitable skills, '
          'training and livelihood opportunities.',
      isAssistant: true,
    ),
    const ChatMessage(
      message:
          'Let us start by understanding what kind of work you are '
          'interested in.',
      isAssistant: true,
    ),
  ];

  void _toggleListening() {
    setState(() {
      _isListening = !_isListening;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.10),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.support_agent_rounded,
                color: AppColors.primary,
                size: 23,
              ),
            ),
            const SizedBox(width: 12),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Saathi',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
                Text(
                  'Your livelihood assistant',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
                ),
              ],
            ),
          ],
        ),
      ),

      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];

                return _ChatBubble(message: message);
              },
            ),
          ),

          _buildListeningArea(context),
        ],
      ),
    );
  }

  Widget _buildListeningArea(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          top: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
        ),
      ),
      child: Column(
        children: [
          Text(
            _isListening ? 'Listening...' : 'Tap the microphone and speak',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w500,
            ),
          ),

          const SizedBox(height: 14),

          GestureDetector(
            onTap: _toggleListening,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: _isListening ? 86 : 76,
              height: _isListening ? 86 : 76,
              decoration: BoxDecoration(
                color: _isListening ? AppColors.primaryDark : AppColors.primary,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.25),
                    blurRadius: _isListening ? 20 : 12,
                    spreadRadius: _isListening ? 5 : 2,
                  ),
                ],
              ),
              child: Icon(
                _isListening ? Icons.stop_rounded : Icons.mic_rounded,
                color: Colors.white,
                size: 34,
              ),
            ),
          ),

          const SizedBox(height: 12),

          Text(
            _isListening
                ? 'Tap again when you are finished'
                : 'You can speak naturally in your selected language',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  final ChatMessage message;

  const _ChatBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final isAssistant = message.isAssistant;

    return Align(
      alignment: isAssistant ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.82,
        ),
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isAssistant
              ? Theme.of(context).colorScheme.surface
              : AppColors.primary,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(isAssistant ? 4 : 18),
            bottomRight: Radius.circular(isAssistant ? 18 : 4),
          ),
          border: isAssistant
              ? Border.all(color: Theme.of(context).colorScheme.outlineVariant)
              : null,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isAssistant) ...[
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.10),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.support_agent_rounded,
                  size: 17,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 10),
            ],
            Expanded(
              child: Text(
                message.message,
                style: TextStyle(
                  fontSize: 16,
                  height: 1.45,
                  color: isAssistant
                      ? Theme.of(context).colorScheme.onSurface
                      : Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ChatMessage {
  final String message;
  final bool isAssistant;

  const ChatMessage({required this.message, required this.isAssistant});
}
