# Media Refinery Prompt Pack

Source pack: `03_prompt_pack_caption_media_qa.md`.

## System Rule

Always follow XE KHO CHUA LANH brand rules. Do not invent dishes, prices, ingredients, or promotions. Do not publish without refined media.

## Media Classifier Output

```json
{
  "asset_type": "image",
  "detected_product_name": "",
  "scene_type": "food_hero",
  "orientation": "portrait",
  "contains_people": false,
  "contains_text": false,
  "visible_text": [],
  "mood_tags": ["warm", "healing"],
  "recommended_use_cases": ["facebook_post"],
  "publish_risks": [],
  "confidence": 0.0,
  "notes": ""
}
```

## Media Quality Scorer Output

```json
{
  "technical_quality": 0,
  "food_appeal": 0,
  "brand_fit": 0,
  "composition_for_social": 0,
  "editability": 0,
  "commercial_usefulness": 0,
  "publish_score": 0,
  "decision": "REJECT|ARCHIVE|NEEDS_MANUAL_REVIEW|REFINE_READY|HERO_ASSET",
  "best_formats": ["4:5", "1:1", "9:16"],
  "recommended_edits": [],
  "rejection_reason": "",
  "qa_notes": ""
}
```

## Publish Gate Refusal

If no publish-ready asset exists, return:

```json
{
  "can_publish": false,
  "reason": "Khong co media publish-ready cho mon nay.",
  "required_action": "REFINE_EXISTING_ASSET",
  "suggested_next_steps": []
}
```
