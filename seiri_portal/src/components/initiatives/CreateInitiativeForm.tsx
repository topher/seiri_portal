// Create Initiative Form Component
// Comprehensive form for creating initiatives with value tracking and RACI assignment

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Users, DollarSign, Calendar, Target } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
// Value Manager will be used through API calls when the form is submitted

interface CreateInitiativeFormProps {
  workspaceId: string;
  onSuccess: (initiative: any) => void;
  onCancel: () => void;
}

interface InitiativeFormData {
  name: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedValue: string;
  targetLaunchDate?: Date;
  businessObjectives: string[];
  stakeholders: string[];
  initiativeType: 'PRD' | 'BUSINESS_MODEL' | 'CUSTOM';
  expectedROI: number;
  clientVisibility: 'LOW' | 'MEDIUM' | 'HIGH';
}

const INITIATIVE_TEMPLATES = {
  PRD: {
    name: 'PRD Development: ',
    description: 'Comprehensive Product Requirements Document development for ',
    businessObjectives: [
      'Define clear product requirements',
      'Establish user personas and needs',
      'Create development roadmap',
      'Align stakeholders on product vision'
    ],
    expectedROI: 25,
    clientVisibility: 'HIGH' as const
  },
  BUSINESS_MODEL: {
    name: 'Business Model Development: ',
    description: 'Comprehensive business model canvas development for ',
    businessObjectives: [
      'Define value proposition',
      'Identify customer segments',
      'Establish revenue streams',
      'Create go-to-market strategy'
    ],
    expectedROI: 30,
    clientVisibility: 'HIGH' as const
  },
  CUSTOM: {
    name: '',
    description: '',
    businessObjectives: [''],
    expectedROI: 15,
    clientVisibility: 'MEDIUM' as const
  }
};

export const CreateInitiativeForm: React.FC<CreateInitiativeFormProps> = ({
  workspaceId,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState<InitiativeFormData>({
    name: '',
    description: '',
    priority: 'MEDIUM',
    estimatedValue: '',
    businessObjectives: [''],
    stakeholders: [''],
    initiativeType: 'CUSTOM',
    expectedROI: 15,
    clientVisibility: 'MEDIUM'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewRaci, setPreviewRaci] = useState<any>(null);
  const [estimatedMetrics, setEstimatedMetrics] = useState<any>(null);
  const [aiRaciPreview, setAiRaciPreview] = useState<any>(null);
  const [isLoadingRaci, setIsLoadingRaci] = useState(false);

  // Update form when template changes
  useEffect(() => {
    if (formData.initiativeType !== 'CUSTOM') {
      const template = INITIATIVE_TEMPLATES[formData.initiativeType];
      setFormData(prev => ({
        ...prev,
        name: prev.name.includes(':') ? template.name + prev.name.split(':')[1] : template.name,
        description: template.description,
        businessObjectives: template.businessObjectives,
        expectedROI: template.expectedROI,
        clientVisibility: template.clientVisibility
      }));
    }
  }, [formData.initiativeType]);

  // Generate RACI preview when initiative type or key details change
  useEffect(() => {
    if (formData.initiativeType !== 'CUSTOM') {
      generateRACIPreview();
    }
  }, [formData.initiativeType]);

  // Get AI RACI recommendation when enough details are provided
  useEffect(() => {
    if (formData.name.trim() && formData.description.trim() && formData.name.length > 5) {
      const debounceTimer = setTimeout(() => {
        getAIRACIRecommendation();
      }, 1000); // Debounce API calls

      return () => clearTimeout(debounceTimer);
    }
  }, [formData.name, formData.description, formData.priority, formData.initiativeType]);

  const generateRACIPreview = () => {
    const raciMappings = {
      PRD: {
        responsible: ['PRODUCT'],
        accountable: 'PRODUCT',
        consulted: ['MARKETING', 'DEVELOPMENT'],
        informed: ['OPERATIONS', 'SALES', 'STRATEGY']
      },
      BUSINESS_MODEL: {
        responsible: ['MARKETING', 'SALES'],
        accountable: 'STRATEGY',
        consulted: ['PRODUCT', 'DEVELOPMENT'],
        informed: ['OPERATIONS']
      }
    };

    if (formData.initiativeType !== 'CUSTOM' && formData.initiativeType in raciMappings) {
      setPreviewRaci(raciMappings[formData.initiativeType as keyof typeof raciMappings]);
      generateEstimatedMetrics();
    }
  };

  const generateEstimatedMetrics = () => {
    const baseMetrics = {
      timeToMarket: formData.initiativeType === 'PRD' ? '6 months' : '4 months',
      estimatedTeamSize: formData.priority === 'HIGH' ? '8-12 people' : '5-8 people',
      riskLevel: formData.priority === 'URGENT' ? 'HIGH' : 'MEDIUM',
      valueDeliveryTimeline: '3-6 months after completion'
    };

    setEstimatedMetrics(baseMetrics);
  };

  const getAIRACIRecommendation = async () => {
    if (isLoadingRaci) return;
    
    setIsLoadingRaci(true);
    
    try {
      const response = await fetch('/api/initiatives/raci-recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initiativeName: formData.name,
          description: formData.description,
          initiativeType: formData.initiativeType === 'CUSTOM' ? undefined : formData.initiativeType,
          priority: formData.priority,
          estimatedValue: parseFloat(formData.estimatedValue.replace(/[^0-9.-]/g, '')) || undefined,
          businessObjectives: formData.businessObjectives.filter(obj => obj.trim())
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.recommendation) {
          setAiRaciPreview({
            ...result.recommendation,
            source: 'AI',
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Failed to get AI RACI recommendation:', error);
    } finally {
      setIsLoadingRaci(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Initiative name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.estimatedValue.trim()) {
      newErrors.estimatedValue = 'Estimated value is required';
    }

    if (formData.businessObjectives.every(obj => !obj.trim())) {
      newErrors.businessObjectives = 'At least one business objective is required';
    }

    if (formData.expectedROI < 0 || formData.expectedROI > 100) {
      newErrors.expectedROI = 'ROI must be between 0 and 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare initiative data for the API
      const initiativeData = {
        name: formData.name,
        description: formData.description,
        moscow: formData.priority === 'HIGH' ? 'MUST' : 
               formData.priority === 'MEDIUM' ? 'SHOULD' : 'COULD',
        workspaceId,
        assigneeId: undefined, // Could be added later
        startDate: undefined,
        endDate: undefined
      };

      // Call the real initiative API
      const response = await fetch('/api/initiatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(initiativeData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create initiative: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.data) {
        // Show success message with RACI info if available
        let successMessage = 'Initiative created successfully!';
        if (result.data.raciAssignment) {
          successMessage += ` AI generated RACI assignment with ${result.data.raciAssignment.confidence}% confidence.`;
        }

        // Value tracking will be initialized via API when needed
        // The server-side API will handle ValueManager.initializeInitiativeTracking

        // Call success callback with enhanced data
        onSuccess({
          ...result.data,
          enhancedMetadata: {
            raciGenerated: !!result.data.raciAssignment,
            valueTrackingEnabled: !!formData.estimatedValue,
            aiConfidence: result.data.raciAssignment?.confidence,
            createdWithAI: true
          }
        });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Failed to create initiative:', error);
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Failed to create initiative. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addBusinessObjective = () => {
    setFormData(prev => ({
      ...prev,
      businessObjectives: [...prev.businessObjectives, '']
    }));
  };

  const updateBusinessObjective = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      businessObjectives: prev.businessObjectives.map((obj, i) => i === index ? value : obj)
    }));
  };

  const removeBusinessObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      businessObjectives: prev.businessObjectives.filter((_, i) => i !== index)
    }));
  };

  const addStakeholder = () => {
    setFormData(prev => ({
      ...prev,
      stakeholders: [...prev.stakeholders, '']
    }));
  };

  const updateStakeholder = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      stakeholders: prev.stakeholders.map((stakeholder, i) => i === index ? value : stakeholder)
    }));
  };

  const removeStakeholder = (index: number) => {
    setFormData(prev => ({
      ...prev,
      stakeholders: prev.stakeholders.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Create New Initiative
          </CardTitle>
          <CardDescription>
            Set up a new initiative with automatic RACI assignment and value tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Initiative Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="initiativeType">Initiative Type</Label>
              <Select
                value={formData.initiativeType}
                onValueChange={(value: 'PRD' | 'BUSINESS_MODEL' | 'CUSTOM') =>
                  setFormData(prev => ({ ...prev, initiativeType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select initiative type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRD">PRD Development</SelectItem>
                  <SelectItem value="BUSINESS_MODEL">Business Model Development</SelectItem>
                  <SelectItem value="CUSTOM">Custom Initiative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Initiative Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter initiative name"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') =>
                    setFormData(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter initiative description"
                rows={3}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
            </div>

            {/* Value Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedValue" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Estimated Value *
                </Label>
                <Input
                  id="estimatedValue"
                  value={formData.estimatedValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedValue: e.target.value }))}
                  placeholder="e.g., $2M revenue in first year"
                  className={errors.estimatedValue ? 'border-red-500' : ''}
                />
                {errors.estimatedValue && <p className="text-sm text-red-500">{errors.estimatedValue}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedROI">Expected ROI (%)</Label>
                <Input
                  id="expectedROI"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.expectedROI}
                  onChange={(e) => setFormData(prev => ({ ...prev, expectedROI: parseFloat(e.target.value) || 0 }))}
                  placeholder="Expected ROI percentage"
                  className={errors.expectedROI ? 'border-red-500' : ''}
                />
                {errors.expectedROI && <p className="text-sm text-red-500">{errors.expectedROI}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientVisibility">Client Visibility</Label>
              <Select
                value={formData.clientVisibility}
                onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH') =>
                  setFormData(prev => ({ ...prev, clientVisibility: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low - Internal tracking only</SelectItem>
                  <SelectItem value="MEDIUM">Medium - Periodic client updates</SelectItem>
                  <SelectItem value="HIGH">High - Full client dashboard access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Business Objectives */}
            <div className="space-y-3">
              <Label>Business Objectives *</Label>
              {formData.businessObjectives.map((objective, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={objective}
                    onChange={(e) => updateBusinessObjective(index, e.target.value)}
                    placeholder="Enter business objective"
                  />
                  {formData.businessObjectives.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeBusinessObjective(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBusinessObjective}
              >
                Add Objective
              </Button>
              {errors.businessObjectives && <p className="text-sm text-red-500">{errors.businessObjectives}</p>}
            </div>

            {/* Stakeholders */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Stakeholders
              </Label>
              {formData.stakeholders.map((stakeholder, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={stakeholder}
                    onChange={(e) => updateStakeholder(index, e.target.value)}
                    placeholder="Enter stakeholder name/email"
                  />
                  {formData.stakeholders.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeStakeholder(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStakeholder}
              >
                Add Stakeholder
              </Button>
            </div>

            {/* AI RACI Preview */}
            {aiRaciPreview && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    AI-Generated RACI Assignment
                  </CardTitle>
                  <CardDescription>
                    Intelligent suite assignment based on initiative analysis 
                    <Badge variant="outline" className="ml-2">
                      {aiRaciPreview.confidence}% confidence
                    </Badge>
                    <Badge variant="outline" className="ml-1">
                      {aiRaciPreview.method || 'AI'}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-green-600">Responsible</Label>
                      <div className="space-y-1">
                        {aiRaciPreview.responsible.map((suite: string) => (
                          <Badge key={suite} variant="outline" className="text-green-600 border-green-600">
                            {suite}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{aiRaciPreview.reasoning?.responsible}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-blue-600">Accountable</Label>
                      <div>
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          {aiRaciPreview.accountable}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{aiRaciPreview.reasoning?.accountable}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-orange-600">Consulted</Label>
                      <div className="space-y-1">
                        {aiRaciPreview.consulted.map((suite: string) => (
                          <Badge key={suite} variant="outline" className="text-orange-600 border-orange-600">
                            {suite}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{aiRaciPreview.reasoning?.consulted}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Informed</Label>
                      <div className="space-y-1">
                        {aiRaciPreview.informed.map((suite: string) => (
                          <Badge key={suite} variant="outline" className="text-gray-600 border-gray-600">
                            {suite}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{aiRaciPreview.reasoning?.informed}</p>
                    </div>
                  </div>
                  
                  {isLoadingRaci && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                      Analyzing initiative for optimal RACI assignment...
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Static RACI Preview (fallback) */}
            {previewRaci && !aiRaciPreview && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">RACI Assignment Preview</CardTitle>
                  <CardDescription>
                    Template-based suite assignment for {formData.initiativeType} initiatives
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-green-600">Responsible</Label>
                      <div className="space-y-1">
                        {previewRaci.responsible.map((suite: string) => (
                          <Badge key={suite} variant="outline" className="text-green-600 border-green-600">
                            {suite}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-blue-600">Accountable</Label>
                      <div>
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          {previewRaci.accountable}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-orange-600">Consulted</Label>
                      <div className="space-y-1">
                        {previewRaci.consulted.map((suite: string) => (
                          <Badge key={suite} variant="outline" className="text-orange-600 border-orange-600">
                            {suite}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Informed</Label>
                      <div className="space-y-1">
                        {previewRaci.informed.map((suite: string) => (
                          <Badge key={suite} variant="outline" className="text-gray-600 border-gray-600">
                            {suite}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Estimated Metrics */}
            {estimatedMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estimated Metrics</CardTitle>
                  <CardDescription>
                    Projected timeline and resource requirements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Time to Market</Label>
                      <p className="text-sm text-gray-600">{estimatedMetrics.timeToMarket}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Team Size</Label>
                      <p className="text-sm text-gray-600">{estimatedMetrics.estimatedTeamSize}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Risk Level</Label>
                      <p className="text-sm text-gray-600">{estimatedMetrics.riskLevel}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Value Timeline</Label>
                      <p className="text-sm text-gray-600">{estimatedMetrics.valueDeliveryTimeline}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Alert */}
            {errors.submit && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Initiative...' : 'Create Initiative'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};