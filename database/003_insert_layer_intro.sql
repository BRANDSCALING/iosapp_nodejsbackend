-- ============================================
-- BrandScaling E-DNA Quiz Database Setup
-- File: 003_insert_layer_intro.sql
-- Description: Inserts layer introduction content for all 7 layers
-- ============================================

-- Clear existing layer intro data (if any)
DELETE FROM layer_intro_content;

-- ============================================
-- Insert Layer Intro Content (7 layers)
-- ============================================

INSERT INTO layer_intro_content (layer_number, title, description, content) VALUES

-- Layer 1: Core Type
(1, 
 'Core Type', 
 'Discover your foundational brand DNA',
 'Welcome to Layer 1 of your E-DNA discovery journey. This foundational layer reveals your Core Type - the fundamental energy that drives your brand identity. 

You will answer 8 questions designed to uncover whether you are primarily an Architect (building through systems, structure, and strategy) or an Alchemist (creating through transformation, innovation, and intuition).

Your Core Type shapes everything about how you approach business, communicate with your audience, and create value in the world. There are no right or wrong answers - simply choose the response that resonates most deeply with who you are.

Take your time with each question. Trust your first instinct.'),

-- Layer 2: Subtype
(2, 
 'Subtype', 
 'Refine your unique brand personality',
 'Now that you have discovered your Core Type, Layer 2 dives deeper to reveal your Subtype - the specific expression of your foundational energy.

Just as there are many ways to be an Architect or Alchemist, there are distinct subtypes that capture the nuances of your brand personality. This layer helps you understand not just what you are, but how you uniquely express it.

Your Subtype will provide more specific guidance on your natural strengths, communication style, and the unique value you bring to your audience.

Continue answering honestly, choosing the responses that feel most authentic to you.'),

-- Layer 3: Communication Style
(3, 
 'Communication Style', 
 'How you connect and convey your message',
 'Layer 3 explores your natural Communication Style - the way you connect with others and convey your message to the world.

Your communication style is how your Core Type and Subtype express themselves in every interaction, piece of content, and conversation you have. Understanding this helps you create messaging that feels authentic and resonates deeply with your ideal audience.

This layer reveals whether you naturally lead with logic or emotion, facts or stories, directness or nuance. It will help you craft a communication approach that feels effortless and magnetic.

Pay attention to how you naturally prefer to express ideas and connect with others.'),

-- Layer 4: Decision-Making Process
(4, 
 'Decision-Making Process', 
 'Understanding how you choose and commit',
 'Layer 4 uncovers your Decision-Making Process - the internal system you use to evaluate options, make choices, and commit to action.

How you make decisions affects everything in your business: from the offers you create, to the clients you accept, to the partnerships you form. Understanding your natural decision-making style helps you trust your process and make choices that align with your brand DNA.

This layer reveals your relationship with analysis vs intuition, speed vs deliberation, and individual judgment vs collaborative input.

Reflect on how you have made important decisions in the past as you answer these questions.'),

-- Layer 5: Value System
(5, 
 'Value System', 
 'The principles that guide your brand',
 'Layer 5 illuminates your Value System - the core principles and beliefs that guide every aspect of your brand.

Your values are the non-negotiable truths that inform your decisions, attract your ideal clients, and differentiate you from everyone else in your space. When your brand is aligned with your true values, everything flows more easily.

This layer helps you articulate what matters most to you, what you stand for, and what you will never compromise on. These values become the ethical backbone of your brand.

Be honest about what truly matters to you, not what you think should matter.'),

-- Layer 6: Growth Pattern
(6, 
 'Growth Pattern', 
 'How you evolve and scale your impact',
 'Layer 6 reveals your Growth Pattern - the natural way you evolve, expand, and scale your impact over time.

Not all growth looks the same. Some brands grow through steady, methodical expansion. Others grow through rapid innovation and pivots. Understanding your natural growth pattern helps you plan for scaling in a way that feels sustainable and authentic.

This layer uncovers whether you prefer linear or exponential growth, depth or breadth, organic evolution or strategic acceleration.

Think about how you have grown in the past and what type of growth energizes rather than drains you.'),

-- Layer 7: Legacy Vision
(7, 
 'Legacy Vision', 
 'The lasting impact you want to create',
 'Layer 7 completes your E-DNA profile by revealing your Legacy Vision - the lasting impact you want to create in the world.

Your legacy is the ultimate expression of your brand. It is the change you want to make, the mark you want to leave, and the future you want to create. Understanding your legacy vision provides direction, meaning, and motivation for everything you build.

This final layer connects all the previous layers into a coherent picture of who you are and what you are here to do. It transforms your brand from a business into a mission.

Dream big. What would you create if you knew you could not fail?');

-- ============================================
-- Verification Queries
-- ============================================

-- Count layer intros
SELECT 
    'layer_intro_content' as table_name,
    COUNT(*) as row_count,
    CASE WHEN COUNT(*) = 7 THEN '✅ PASS' ELSE '❌ FAIL (expected 7)' END as status
FROM layer_intro_content;

-- Verify all 7 layers exist
SELECT 
    layer_number,
    title,
    LENGTH(description) as desc_length,
    LENGTH(content) as content_length,
    CASE WHEN LENGTH(content) > 100 THEN '✅' ELSE '❌' END as has_content
FROM layer_intro_content
ORDER BY layer_number;

-- Verify no missing layers
SELECT 
    CASE 
        WHEN COUNT(*) = 7 
        AND MIN(layer_number) = 1 
        AND MAX(layer_number) = 7 
        THEN '✅ All 7 layers present (1-7)'
        ELSE '❌ Missing layers detected'
    END as layer_check
FROM layer_intro_content;

-- ============================================
-- Setup Complete Message
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '  ✅ Layer Intro Content Inserted!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '  Layers: 7';
    RAISE NOTICE '  Content: Full descriptions for each layer';
    RAISE NOTICE '============================================';
END $$;



