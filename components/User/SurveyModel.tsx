import { Dialog, Transition } from '@headlessui/react';
import { FC, Fragment, useContext, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

import { useTranslation } from 'next-i18next';

import { markSurveyIsFilledInLocalStorage } from '@/utils/app/ui';
import { getOrGenerateUserId } from '@/utils/data/taggingHelper';

import HomeContext from '@/pages/api/home/home.context';

import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';

type Props = {
  onClose: () => void;
};

interface Options {
  value: string;
  label: string;
}

export const SurveyModel: FC<Props> = ({ onClose }) => {
  const { t } = useTranslation('survey');
  const {
    state: { user },
    dispatch: homeDispatch,
  } = useContext(HomeContext);
  const supabaseClient = useMemo(() => createBrowserSupabaseClient(), []);

  const occupationOptions = [
    { value: 'student', label: 'Student' },
    { value: 'teacher', label: 'Teacher / Professor / Educator' },
    { value: 'creative', label: 'Artist / Writer / Influencer / Youtuber' },
    { value: 'engineer', label: 'Engineer' },
    { value: 'it_professional', label: 'IT professional' },
    {
      value: 'tradesperson',
      label: 'Tradesperson (e.g. plumber, electrician, carpenter)',
    },
    { value: 'retail_salesperson', label: 'Retail worker / salesperson' },
    { value: 'manager_executive', label: 'Manager / Executive' },
    { value: 'self_employed', label: 'Self-employed / Business Owner' },
    { value: 'freelancer', label: 'Freelancer' },
    { value: 'homemaker', label: 'Homemaker' },
    { value: 'retired', label: 'Retired' },
    { value: 'prefer_no_answer', label: 'I prefer not to answer' },
    { value: 'other_occupation', label: 'Other' },
  ];

  const useCaseOptions = [
    { value: 'education', label: 'Education or Training Purposes' },
    { value: 'homework', label: 'Help with homework' },
    { value: 'content_creation', label: 'Content creation' },
    { value: 'coding', label: 'Programming / Coding' },
    { value: 'grammar', label: 'Grammar and writing check' },
    { value: 'translation', label: 'Translation' },
    { value: 'complex_problem', label: 'Complex problem solving' },
    { value: 'google_alternative', label: 'Alternative to Google search' },
    { value: 'other_usecase', label: 'Other' },
  ];

  const featuresOptions = [
    { value: 'folder', label: 'Folders' },
    { value: 'prompts', label: 'Save Prompts' },
    { value: 'share', label: 'Share Conversations' },
    { value: 'import_export', label: 'Import / Export Data' },
    { value: 'online', label: 'Online Mode' },
    { value: 'cloud_sync', label: 'Cloud Sync (Pro Plan)' },
    { value: 'gpt_4', label: 'GPT-4 integration (Pro Plan)' },
    { value: 'ai_speech', label: 'AI Speech (Pro Plan)' },
    { value: 'image', label: 'AI image generation' },
    { value: 'other_feature', label: 'Other' },
  ];

  const preferredOptions = [
    { value: 'not_preferred', label: 'Not A Preferred Choice Yet' },
    { value: 'restriction', label: 'ChatGPT Is Restricted In Your Region' },
    { value: 'affordable', label: 'Affordable Pro Plan' },
    {
      value: 'additional_features',
      label: 'Additional Features (Folders, Prompts, Share...)',
    },
    { value: 'no_login', label: 'No Login / Sign up Required' },
    { value: 'not_sure', label: "I'm Not Entirely Certain" },
    { value: 'other_preferred', label: 'Other' },
  ];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedOccupation, setSelectedOccupation] = useState('');
  const [otherOccupation, setOtherOccupation] = useState('');
  const [selectedUseCases, setSelectedUseCases] = useState<Options[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<Options[]>([]);
  const [selectedPreferred, setSelectedPreferred] = useState<Options[]>([]);
  const [comment, setComment] = useState('');

  const handleCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    stateVar: any,
    setStateVar: React.Dispatch<React.SetStateAction<any>>,
  ) => {
    const { value, checked } = event.target;
    setStateVar((prev: any) => {
      const newState = Object.entries({
        ...prev,
        [value]: checked,
      })
        .filter(([key, value]) => value)
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {}) as {
        value: string;
        label: string;
      }[];
      stateVar === selectedUseCases && setSelectedUseCases(newState);
      stateVar === selectedFeatures && setSelectedFeatures(newState);
      stateVar === selectedPreferred && setSelectedPreferred(newState);
      return newState;
    });
  };

  const handleSubmit = async () => {
    // Validation check
    if (
      name == '' ||
      selectedOccupation.length === 0 ||
      (selectedOccupation === 'other_occupation' && otherOccupation === '')
    ) {
      if (name == '') {
        const nameInput = document.getElementById('name') as HTMLInputElement;
        nameInput.style.borderColor = 'red';

        const errorLabel = document.getElementById(
          'error-name',
        ) as HTMLInputElement;
        errorLabel.style.display = 'block';
      } else {
        const occInput = document.getElementById(
          'occupation',
        ) as HTMLInputElement;
        occInput.style.borderColor = 'red';

        const errorLabel = document.getElementById(
          'error-occupation',
        ) as HTMLInputElement;
        errorLabel.style.display = 'block';
      }
      return;
    }
    //Supabase query
    try {
      const { error } = await supabaseClient.from('user_survey').insert({
        uid: user?.id,
        non_login_uid: getOrGenerateUserId(),
        name: name,
        occupation:
          selectedOccupation === 'other_occupation'
            ? otherOccupation
            : selectedOccupation,
        email: email,
        use_case: selectedUseCases,
        value_features: selectedFeatures,
        preferred_choice: selectedPreferred,
        comments: comment,
      });
      if (error) {
        toast.error(t('Something went wrong. Please try again.'));
        return;
      }
      toast.success(t('Thanks for completing the survey!'), {
        duration: 5000,
      });
      markSurveyIsFilledInLocalStorage();
      homeDispatch({ field: 'isSurveyFilled', value: true });
      onClose();
    } catch (err) {
      toast.error(t('Something went wrong. Please try again.'));
    }
  };

  const OptionLabels = ({ option }: { option: string }) => (
    <span>{t(option)}</span>
  );

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose} open>
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md md:max-w-lg transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all bg-neutral-800 text-white">
                <Dialog.Description>
                  <div className="rounded-2xl flex flex-col">
                    <span className="text-lg mb-6">
                      {t(
                        'Please share your thoughts by completing a brief survey.',
                      )}
                    </span>

                    <div className="w-full h-96 overflow-y-scroll">
                      {/* 1. Name */}
                      <div className="mb-4">
                        <label
                          htmlFor="name"
                          className="block text-base text-stone-400 mb-2"
                        >
                          {t('Name (required)')}
                        </label>
                        <label
                          id="error-name"
                          className="text-sm text-rose-500 mb-1 hidden"
                        >
                          {t('Please enter name')}
                        </label>
                        <input
                          type="text"
                          id="name"
                          placeholder={t('John Smith') || 'John Smith'}
                          className="block w-11/12 bg-inherit text-sm border border-dark rounded py-2 px-4 mb-6 leading-tight focus:outline-none focus:border-2"
                          maxLength={50}
                          onChange={(event) => setName(event.target.value)}
                        />
                      </div>

                      {/* 2. Occupation */}
                      <div className="mb-4">
                        <label
                          htmlFor="occupation"
                          className="block text-base text-stone-400 mb-2"
                        >
                          {t('Occupation (required)')}
                        </label>
                        <label
                          id="error-occupation"
                          className="block text-sm text-rose-500 mb-1 hidden"
                        >
                          {t('Please select your occupation')}
                        </label>
                        <select
                          id="occupation"
                          className="block w-11/12 bg-inherit text-sm border border-dark rounded py-2 px-4 mb-6 leading-tight focus:outline-none focus:border-2"
                          value={selectedOccupation}
                          onChange={(event) =>
                            setSelectedOccupation(event.target.value)
                          }
                        >
                          <option value="">{t('Select an occupation')}</option>
                          {occupationOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              <OptionLabels
                                key={option.value}
                                option={option.label}
                              />
                            </option>
                          ))}
                        </select>
                        {selectedOccupation === 'other_occupation' && (
                          <input
                            type="text"
                            id="otherOccupation"
                            className="block w-11/12 bg-inherit text-sm border border-dark rounded py-2 px-4 mb-3 leading-tight focus:outline-none focus:border-2"
                            placeholder={
                              t('Please specify') || 'Please specify'
                            }
                            maxLength={100}
                            onChange={(event) =>
                              setOtherOccupation(event.target.value)
                            }
                          />
                        )}
                      </div>

                      {/* 3. Email */}
                      {!user && (
                        <div className="mb-4">
                          <label
                            htmlFor="name"
                            className="block text-base text-stone-400 mb-2"
                          >
                            {t(
                              'Email (optional if you would like to be contacted)',
                            )}
                          </label>
                          <input
                            type="email"
                            className="block w-11/12 bg-inherit text-sm border border-dark rounded py-2 px-4 mb-6 leading-tight focus:outline-none focus:border-2"
                            maxLength={50}
                            onChange={(event) => setEmail(event.target.value)}
                            value={email}
                          />
                        </div>
                      )}

                      {/* 4. UseCase */}
                      <div className="mb-6">
                        <label
                          htmlFor="useCase"
                          className="block text-base text-stone-400 mb-2"
                        >
                          {t('What Do You Use Chat Everywhere For?')}
                        </label>
                        {useCaseOptions.map((option) => (
                          <div key={option.value}>
                            <input
                              type="checkbox"
                              id={option.value}
                              value={option.value}
                              onChange={(event) =>
                                handleCheckboxChange(
                                  event,
                                  selectedUseCases,
                                  setSelectedUseCases,
                                )
                              }
                            />
                            <label
                              htmlFor={option.value}
                              className="text-sm px-2"
                            >
                              <OptionLabels
                                key={option.value}
                                option={option.label}
                              />
                            </label>
                            {option.value === 'other_usecase' &&
                              selectedUseCases[
                                option.value as keyof typeof selectedUseCases
                              ] && (
                                <input
                                  type="text"
                                  id="otherUseCase"
                                  className="block w-11/12 bg-inherit text-sm border border-dark rounded py-2 px-4 mb-3 mt-1 leading-tight focus:outline-none focus:border-2"
                                  placeholder={
                                    t('Please specify') || 'Please specify'
                                  }
                                  maxLength={100}
                                  onChange={(event) =>
                                    setSelectedUseCases((prev: any) => ({
                                      ...prev,
                                      [option.value]: event.target.value,
                                    }))
                                  }
                                />
                              )}
                          </div>
                        ))}
                      </div>

                      {/* 5. Features */}
                      <div className="mb-6">
                        <label
                          htmlFor="features"
                          className="block text-base text-stone-400 mb-2"
                        >
                          {t(
                            'Which Chat Everywhere features appeal to you the most?',
                          )}
                        </label>
                        {featuresOptions.map((option) => (
                          <div key={option.value}>
                            <input
                              type="checkbox"
                              id={option.value}
                              value={option.value}
                              onChange={(event) =>
                                handleCheckboxChange(
                                  event,
                                  selectedFeatures,
                                  setSelectedFeatures,
                                )
                              }
                            />
                            <label
                              htmlFor={option.value}
                              className="text-sm px-2"
                            >
                              <OptionLabels
                                key={option.value}
                                option={option.label}
                              />
                            </label>

                            {option.value === 'other_feature' &&
                              selectedFeatures[
                                option.value as keyof typeof selectedUseCases
                              ] && (
                                <input
                                  type="text"
                                  id="otherFeature"
                                  className="block w-11/12 bg-inherit text-sm border border-dark rounded py-2 px-4 mb-3 mt-1 leading-tight focus:outline-none focus:border-2"
                                  placeholder={
                                    t('Please specify') || 'Please specify'
                                  }
                                  maxLength={100}
                                  onChange={(event) =>
                                    setSelectedFeatures((prev: any) => ({
                                      ...prev,
                                      [option.value]: event.target.value,
                                    }))
                                  }
                                />
                              )}
                          </div>
                        ))}
                      </div>

                      {/* 6. Preferred */}
                      <div className="mb-6">
                        <label
                          htmlFor="preferred"
                          className="block text-base text-stone-400 mb-2"
                        >
                          {t(
                            'What makes Chat Everywhere your preferred choice over official ChatGPT?',
                          )}
                        </label>
                        {preferredOptions.map((option) => (
                          <div key={option.value}>
                            <input
                              type="checkbox"
                              id={option.value}
                              value={option.value}
                              onChange={(event) =>
                                handleCheckboxChange(
                                  event,
                                  selectedPreferred,
                                  setSelectedPreferred,
                                )
                              }
                            />
                            <label
                              htmlFor={option.value}
                              className="text-sm px-2"
                            >
                              <OptionLabels
                                key={option.value}
                                option={option.label}
                              />
                            </label>
                            {option.value === 'other_preferred' &&
                              selectedPreferred[
                                option.value as keyof typeof selectedUseCases
                              ] && (
                                <input
                                  type="text"
                                  id="otherPreferred"
                                  className="block w-11/12 bg-inherit text-sm border border-dark rounded py-2 px-4 mb-3 mt-1 leading-tight focus:outline-none focus:border-2"
                                  placeholder={
                                    t('Please specify') || 'Please specify'
                                  }
                                  maxLength={200}
                                  onChange={(event) =>
                                    setSelectedPreferred((prev: any) => ({
                                      ...prev,
                                      [option.value]: event.target.value,
                                    }))
                                  }
                                />
                              )}
                          </div>
                        ))}
                      </div>

                      {/* 7. Comments */}
                      <div className="mb-4">
                        <label
                          htmlFor="comment"
                          className="block text-base text-stone-400 mb-2"
                        >
                          {t(
                            "Is there anything you'd like to tell us? (Optional)",
                          )}
                        </label>

                        <input
                          type="text"
                          id="comment"
                          placeholder={
                            t(
                              'Any comments, feedback or suggestions are welcome!',
                            ) ||
                            'Any comments, feedback or suggestions are welcome!'
                          }
                          className="block w-11/12 bg-inherit text-sm border border-dark rounded py-2 px-4 mb-6 leading-tight focus:outline-none focus:border-2"
                          maxLength={450}
                          onChange={(event) => setComment(event.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </Dialog.Description>

                <div className="flex justify-between mt-4">
                  <button
                    type="button"
                    className="px-4 py-2 border rounded-lg shadow border-neutral-500 text-neutral-200 hover:bg-neutral-700 focus:outline-none"
                    onClick={onClose}
                  >
                    {t('Close')}
                  </button>

                  <button
                    type="button"
                    className="px-4 py-2 border rounded-lg shadow text-black bg-slate-200 hover:bg-slate-300 focus:outline-none"
                    onClick={handleSubmit}
                  >
                    {t('Submit')}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
